/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { act as doAct, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { ProbeTemplate } from '@app/Shared/Services/Api.service';
import {
  MessageMeta,
  MessageType,
  NotificationCategory,
  NotificationMessage,
} from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import userEvent from '@testing-library/user-event';
import { DeleteProbeTemplates } from '@app/Modal/DeleteWarningUtils';
import { AgentProbeTemplates } from '@app/Agent/AgentProbeTemplates';

const mockMessageType = { type: 'application', subtype: 'json' } as MessageType;

const mockProbeTemplate: ProbeTemplate = {
  name: 'someProbeTemplate',
  xml: '<some><dummy><xml></xml></dummy></some>',
};

const mockAnotherProbeTemplate: ProbeTemplate = {
  name: 'anotherProbeTemplate',
  xml: '<some><other><xml></xml></dummy></some>',
};

const mockFileUpload = new File([mockProbeTemplate.xml], 'probe_template.xml', { type: 'xml' });

const mockCreateTemplateNotification = {
  meta: {
    category: NotificationCategory.ProbeTemplateUploaded,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    template: mockAnotherProbeTemplate,
  },
} as NotificationMessage;

const mockDeleteTemplateNotification = {
  meta: {
    category: NotificationCategory.ProbeTemplateDeleted,
    type: mockMessageType,
  },
  message: {
    template: mockProbeTemplate,
  },
} as NotificationMessage;

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(false) // should delete a probe template when Delete is clicked
  .mockReturnValue(true); // should show warning modal and delete a probe template when confirmed

const uploadRequestSpy = jest.spyOn(defaultServices.api, 'addCustomProbeTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'insertProbes').mockReturnValue(of(true));

jest
  .spyOn(defaultServices.api, 'getProbeTemplates')
  .mockReturnValueOnce(of([mockProbeTemplate])) // renders Correctly

  .mockReturnValueOnce(of([mockProbeTemplate])) // should add a probe template after receiving a notification
  .mockReturnValueOnce(of([mockProbeTemplate, mockAnotherProbeTemplate]))

  .mockReturnValueOnce(of([mockProbeTemplate])) // should remove a probe template after receiving a notification
  .mockReturnValueOnce(of([]))

  .mockReturnValue(of([mockProbeTemplate])); // All other tests

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateTemplateNotification)) // adds a template after receiving a notification
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockDeleteTemplateNotification)) // removes a template after receiving a notification

  .mockReturnValue(of()); // All other tests

describe('<AgentProbeTemplates />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <AgentProbeTemplates />
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should add a probe template after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );

    const addTemplateName = screen.getByText('anotherProbeTemplate');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should remove a probe template after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );
    expect(screen.queryByText('someProbeTemplate')).not.toBeInTheDocument();
  });

  it('should display the column header fields', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );
    const nameHeader = screen.getByText('Name');
    expect(nameHeader).toBeInTheDocument();
    expect(nameHeader).toBeVisible();

    const xmlHeader = screen.getByText('XML');
    expect(xmlHeader).toBeInTheDocument();
    expect(xmlHeader).toBeVisible();
  });

  it('should show modal when uploading', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    userEvent.click(uploadButton);

    const uploadModal = await screen.findByRole('dialog');
    expect(uploadModal).toBeInTheDocument();
    expect(uploadModal).toBeVisible();

    const modalTitle = within(uploadModal).getByText('Create Custom Probe Template');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();
  });

  it('should upload a probe template when form is filled and Submit is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    userEvent.click(uploadButton);

    const uploadModal = await screen.findByRole('dialog');
    expect(uploadModal).toBeInTheDocument();
    expect(uploadModal).toBeVisible();

    const modalTitle = within(uploadModal).getByText('Create Custom Probe Template');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const fileUploadDropZone = within(uploadModal).getByLabelText(
      'Drag a file here or browse to upload'
    ) as HTMLInputElement;
    expect(fileUploadDropZone).toBeInTheDocument();
    expect(fileUploadDropZone).toBeVisible();

    const browseButton = within(uploadModal).getByRole('button', { name: 'Browse...' });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toBeVisible();

    const uploadInput = uploadModal.querySelector("input[accept='.xml'][type='file']") as HTMLInputElement;
    expect(uploadInput).toBeInTheDocument();
    expect(uploadInput).not.toBeVisible();

    userEvent.click(browseButton);
    userEvent.upload(uploadInput, mockFileUpload);

    expect(uploadInput.files).not.toBe(null);
    expect(uploadInput.files![0]).toStrictEqual(mockFileUpload);

    const submitButton = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await doAct(async () => {
      userEvent.click(submitButton);
    });

    expect(uploadRequestSpy).toHaveBeenCalledTimes(1);
    expect(uploadRequestSpy).toHaveBeenCalledWith(mockFileUpload);
  });

  it('should delete a probe template when Delete is clicked', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByLabelText('Actions'));

    const deleteButton = await screen.findByText('Delete');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeVisible();

    userEvent.click(deleteButton);

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someProbeTemplate');
  });

  it('should show warning modal and delete a probe template when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentProbeTemplates />
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByLabelText('Actions'));

    const deleteButton = await screen.findByText('Delete');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeVisible();

    userEvent.click(deleteButton);

    const warningModal = await screen.findByRole('dialog');
    expect(warningModal).toBeInTheDocument();
    expect(warningModal).toBeVisible();

    const modalTitle = within(warningModal).getByText(DeleteProbeTemplates.title);
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const confirmButton = within(warningModal).getByText('Delete');
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeVisible();

    userEvent.click(confirmButton);

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someProbeTemplate');
  });
});
