import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DevtoApi implements ICredentialType {
	name = 'devtoApi';

	displayName = 'DEV Community API';

	icon: Icon = { light: 'file:../nodes/Devto/devto.light.svg', dark: 'file:../nodes/Devto/devto.dark.svg' };

	documentationUrl = 'https://developers.forem.com/api/v0';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Create a key in DEV Settings → Extensions → DEV Community API Keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials?.apiKey}}',
				'User-Agent': 'n8n-nodes-devto',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://dev.to/api',
			url: '/articles/me',
			method: 'GET',
		},
	};
}
