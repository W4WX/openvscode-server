/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IExtensionManagementServer, IExtensionManagementServerService } from 'vs/workbench/services/extensionManagement/common/extensionManagement';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { Schemas } from 'vs/base/common/network';
import { IChannel } from 'vs/base/parts/ipc/common/ipc';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILabelService } from 'vs/platform/label/common/label';
import { isWeb } from 'vs/base/common/platform';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WebExtensionManagementService } from 'vs/workbench/services/extensionManagement/common/webExtensionManagementService';
import { IExtension } from 'vs/platform/extensions/common/extensions';
import { ExtensionManagementChannelClient } from 'vs/platform/extensionManagement/common/extensionManagementIpc';

export class ExtensionManagementServerService implements IExtensionManagementServerService {

	declare readonly _serviceBrand: undefined;

	readonly localExtensionManagementServer: IExtensionManagementServer | null = null;
	readonly remoteExtensionManagementServer: IExtensionManagementServer | null = null;
	readonly webExtensionManagementServer: IExtensionManagementServer | null = null;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILabelService labelService: ILabelService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		const remoteAgentConnection = remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const extensionManagementService = new ExtensionManagementChannelClient(remoteAgentConnection.getChannel<IChannel>('extensions'));
			this.remoteExtensionManagementServer = {
				id: 'remote',
				extensionManagementService,
				get label() { return labelService.getHostLabel(Schemas.vscodeRemote, remoteAgentConnection!.remoteAuthority) || localize('remote', "Remote"); },
			};
		}
		if (isWeb) {
			const extensionManagementService = instantiationService.createInstance(WebExtensionManagementService);
			this.webExtensionManagementServer = {
				id: 'web',
				extensionManagementService,
				label: localize('browser', "Browser"),
			};
			//#region instrument gitpod metrics
			const install = extensionManagementService.install.bind(extensionManagementService);
			extensionManagementService.install = async (location, options) => {
				const source = 'WebExtensionManagementService.install';
				try {
					const result = await install(location, options);
					remoteAgentService.increaseExtensionsInstallCounter(source, 'ok');
					return result;
				} catch (e) {
					remoteAgentService.increaseExtensionsInstallCounter(source, e.message);
					throw e;
				}
			};


			const installFromGallery = extensionManagementService.installFromGallery.bind(extensionManagementService);
			extensionManagementService.installFromGallery = async (extension, options) => {
				const source = 'WebExtensionManagementService.installFromGallery';
				try {
					const result = await installFromGallery(extension, options);
					remoteAgentService.increaseExtensionsInstallCounter(source, 'ok');
					return result;
				} catch (e) {
					remoteAgentService.increaseExtensionsInstallCounter(source, e.message);
					throw e;
				}
			};
			//#endregion
		}
	}

	getExtensionManagementServer(extension: IExtension): IExtensionManagementServer {
		if (extension.location.scheme === Schemas.vscodeRemote) {
			return this.remoteExtensionManagementServer!;
		}
		if (this.webExtensionManagementServer) {
			return this.webExtensionManagementServer;
		}
		throw new Error(`Invalid Extension ${extension.location}`);
	}
}

registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService);
