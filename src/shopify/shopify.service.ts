import { Injectable } from '@nestjs/common';
import { ApiVersion, Session, shopifyApi } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { ApiConfigService } from 'src/config/api-config.service';

@Injectable()
export class ShopifyService {
  public readonly client: ReturnType<typeof shopifyApi>;

  private _session: Session | null = null;
  private readonly _defaultScopes: string[] = [];

  constructor(private readonly config: ApiConfigService) {
    this._defaultScopes = this.config.get('SHOPIFY_SCOPES');
    this.client = shopifyApi({
      apiKey: this.config.get('SHOPIFY_API_KEY'),
      apiSecretKey: this.config.get('SHOPIFY_API_SECRET'),
      scopes: this._defaultScopes,
      hostName: this.config.get('SHOPIFY_HOST_NAME'),
      apiVersion: ApiVersion.January25,
      isEmbeddedApp: false,
    });
  }

  public async getActiveSession() {
    if (this._session?.isActive(this._defaultScopes)) {
      return this._session;
    }
    const { session } = await this.client.auth.clientCredentials({
      shop: this.config.get('SHOPIFY_PRIMARY_SHOP'),
    });
    this._session = session;
    return session;
  }
}
