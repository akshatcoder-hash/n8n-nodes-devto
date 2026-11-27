import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const baseUrl = 'https://dev.to/api';

export class Devto implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DEV Community',
		name: 'devto',
		icon: { light: 'file:devto.light.svg', dark: 'file:devto.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and publish DEV Community articles',
		defaults: {
			name: 'DEV Community',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'devtoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Article',
						value: 'article',
					},
				],
				default: 'article',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['article'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an article',
						action: 'Create an article',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many published articles',
						action: 'Get many articles',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['getAll'],
					},
				},
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Collection ID',
						name: 'collectionId',
						type: 'number',
						default: 0,
						description: 'Return articles belonging to this collection ID',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'options',
						options: [
							{ name: 'All', value: 'all' },
							{ name: 'Fresh', value: 'fresh' },
							{ name: 'Rising', value: 'rising' },
						],
						default: 'fresh',
						description: 'Filter articles by DEV feed state',
					},
					{
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
						default: '',
						description: 'Return articles containing this tag',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated tags; articles matching any tag are returned',
					},
					{
						displayName: 'Tags to Exclude',
						name: 'tagsExclude',
						type: 'string',
						default: '',
						description: 'Comma-separated tags to exclude',
					},
					{
						displayName: 'Top Days',
						name: 'top',
						type: 'number',
						default: 0,
						description: 'Return the most popular articles published in the last N days',
					},
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						description: 'Return articles belonging to this user or organization',
					},
				],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['create'],
					},
				},
				description: 'The article title',
			},
			{
				displayName: 'Body Markdown',
				name: 'bodyMarkdown',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 8,
				},
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['create'],
					},
				},
				description: 'The article body in Markdown',
			},
			{
				displayName: 'Published',
				name: 'published',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['create'],
					},
				},
				description: 'Whether to publish immediately instead of saving a draft',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Canonical URL',
						name: 'canonicalUrl',
						type: 'string',
						default: '',
						description: 'Canonical URL if this article was originally published elsewhere',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Short article summary used for previews and SEO',
					},
					{
						displayName: 'Main Image URL',
						name: 'mainImage',
						type: 'string',
						default: '',
						description: 'Absolute URL of the cover image',
					},
					{
						displayName: 'Series',
						name: 'series',
						type: 'string',
						default: '',
						description: 'Series name to group this article with',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of up to four tags',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const headers: Record<string, string> = {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-nodes-devto',
				};

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
					const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
					const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
					const qs: IDataObject = {};

					if (filters.collectionId) qs.collection_id = filters.collectionId;
					if (filters.state) qs.state = filters.state;
					if (filters.tag) qs.tag = filters.tag;
					if (filters.tags) qs.tags = filters.tags;
					if (filters.tagsExclude) qs.tags_exclude = filters.tagsExclude;
					if (filters.top) qs.top = filters.top;
					if (filters.username) qs.username = filters.username;

					const articles: IDataObject[] = [];
					let page = 1;

					while (true) {
						const remaining = returnAll ? 100 : Math.min(100, limit - articles.length);
						if (remaining <= 0) break;

						const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'devtoApi', {
							method: 'GET',
							baseURL: baseUrl,
							url: '/articles',
							qs: { ...qs, page, per_page: remaining },
							headers,
							json: true,
						})) as IDataObject[];

						if (!Array.isArray(response)) {
							throw new NodeOperationError(this.getNode(), 'DEV API returned an unexpected response', {
								itemIndex,
							});
						}

						articles.push(...response);
						if (response.length < remaining) break;
						page += 1;
					}

					for (const article of articles) {
						returnData.push({ json: article, pairedItem: { item: itemIndex } });
					}
				} else if (operation === 'create') {
					const title = this.getNodeParameter('title', itemIndex) as string;
					const bodyMarkdown = this.getNodeParameter('bodyMarkdown', itemIndex) as string;
					const published = this.getNodeParameter('published', itemIndex) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

					if (!title.trim()) {
						throw new NodeOperationError(this.getNode(), 'Title must not be empty', { itemIndex });
					}
					if (!bodyMarkdown.trim()) {
						throw new NodeOperationError(this.getNode(), 'Body Markdown must not be empty', { itemIndex });
					}

					const article: IDataObject = {
						title,
						body_markdown: bodyMarkdown,
						published,
					};

					if (additionalFields.canonicalUrl) article.canonical_url = additionalFields.canonicalUrl;
					if (additionalFields.description) article.description = additionalFields.description;
					if (additionalFields.mainImage) article.main_image = additionalFields.mainImage;
					if (additionalFields.series) article.series = additionalFields.series;
					if (additionalFields.tags) article.tags = additionalFields.tags;

					const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'devtoApi', {
						method: 'POST',
						baseURL: baseUrl,
						url: '/articles',
						headers,
						body: { article },
						json: true,
					})) as IDataObject;

					returnData.push({ json: response, pairedItem: { item: itemIndex } });
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}

		return [returnData];
	}
}
