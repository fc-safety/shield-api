import { Button, Column, Row } from '@react-email/components';
import React from 'react';
import {
  ClientStatus,
  Prisma,
  ProductRequestStatus,
  ProductType,
} from 'src/generated/prisma/client';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { getProductRequestUrl } from './utils/urls';

export interface NewProductRequestTemplateProps {
  productRequest: Prisma.ProductRequestGetPayload<{
    include: {
      requestor: true;
      client: true;
      site: true;
      productRequestItems: {
        include: {
          product: true;
        };
      };
    };
  }>;
  frontendUrl: string;
}

export const NEW_PRODUCT_REQUEST_TEMPLATE_TEST_PROPS: NewProductRequestTemplateProps =
  {
    frontendUrl: 'http://localhost:5173',
    productRequest: {
      id: '1',
      legacyRequestId: null,
      createdOn: new Date(),
      modifiedOn: new Date(),
      status: ProductRequestStatus.NEW,
      requestorId: '1',
      assetId: null,
      siteId: '1',
      clientId: '1',
      requestor: {
        id: '1',
        createdOn: new Date(),
        modifiedOn: new Date(),
        siteId: '1',
        clientId: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        username: 'john.doe',
        idpId: '1',
        legacyUsername: null,
      },
      client: {
        id: '1',
        legacyClientId: null,
        createdOn: new Date(),
        modifiedOn: new Date(),
        status: ClientStatus.ACTIVE,
        externalId: '1',
        startedOn: new Date(),
        addressId: '1',
        phoneNumber: '1234567890',
        homeUrl: 'https://www.example.com',
        name: 'Test Client',
        defaultInspectionCycle: 30,
        demoMode: false,
      },
      site: {
        id: '1',
        legacySiteId: null,
        legacyGroupId: null,
        createdOn: new Date(),
        modifiedOn: new Date(),
        name: 'Test Site',
        externalId: '1',
        addressId: '1',
        parentSiteId: null,
        clientId: '1',
        phoneNumber: '1234567890',
        primary: true,
      },
      productRequestItems: [
        {
          id: '1',
          legacyRequestItemId: null,
          createdOn: new Date(),
          modifiedOn: new Date(),
          siteId: '1',
          clientId: '1',
          productId: '1',
          productRequestId: '1',
          quantity: 5,
          addedById: '1',
          product: {
            id: '1',
            legacyProductId: null,
            legacyConsumableId: null,
            createdOn: new Date(),
            modifiedOn: new Date(),
            name: 'Test Product',
            clientId: '1',
            quantity: 1,
            active: true,
            manufacturerId: '1',
            type: ProductType.CONSUMABLE,
            description: 'Test Product Description',
            sku: '1234567890',
            productUrl: 'https://www.example.com',
            imageUrl: 'https://www.example.com/image.jpg',
            productCategoryId: '1',
            ansiMinimumRequired: true,
            parentProductId: null,
            price: null,
            perishable: false,
            ansiCategoryId: null,
          },
        },
      ],
    },
  };

function NewProductRequestTemplateText({
  productRequest,
  frontendUrl,
}: NewProductRequestTemplateProps) {
  return `
  Hi,

  ${productRequest.requestor.firstName} ${productRequest.requestor.lastName} has submitted a new supply request on behalf of ${productRequest.client.name}.

  Supply Name               | SKU           | Qty
  ------------------------- | ------------- | ---------
  ${productRequest.productRequestItems.map((item) => `${item.product.name} | ${item.product.sku} | ${item.quantity}`).join('\n')}

  To view the supply request, please visit the link below:

  ${getProductRequestUrl(productRequest.id, frontendUrl)}

  Regards,

  Shield Team
  FC Safety
  `;
}

export default function NewProductRequestTemplateReact({
  productRequest,
  frontendUrl,
}: NewProductRequestTemplateProps): React.ReactElement {
  const url = getProductRequestUrl(productRequest.id, frontendUrl);

  return (
    <Layout>
      <Block>
        <Paragraph>Hi,</Paragraph>
        <Paragraph>
          {productRequest.requestor.firstName}{' '}
          {productRequest.requestor.lastName} has submitted a new supply request
          on behalf of {productRequest.client.name}.
        </Paragraph>
      </Block>
      <Block>
        <Row>
          <Column align="left" className="h-10 w-4/6 bg-gray-200 px-2">
            Supply Name
          </Column>
          <Column align="right" className="h-10 w-1/6 bg-gray-200 px-2">
            SKU
          </Column>
          <Column align="right" className="h-10 w-1/6 bg-gray-200 px-2">
            Qty
          </Column>
        </Row>
        {productRequest.productRequestItems.map((item) => (
          <Row key={item.id} className="text-sm">
            <Column align="left" className="h-8 w-4/6 bg-gray-50 px-2">
              {item.product.name}
            </Column>
            <Column align="right" className="h-8 w-1/6 bg-gray-50 px-2">
              {item.product.sku}
            </Column>
            <Column align="right" className="h-8 w-1/6 bg-gray-50 px-2">
              {item.quantity}
            </Column>
          </Row>
        ))}
      </Block>
      <Block className="text-center">
        <Paragraph>
          To view the supply request, please click the link below:
        </Paragraph>
        <Button
          href={url}
          className="bg-brand text-brand-foreground text-sm px-4 py-2 rounded-md"
        >
          View Product Request
        </Button>
      </Block>
      <Block>
        <Paragraph>Regards,</Paragraph>
        <Paragraph>
          Shield Team
          <br />
          FC Safety
        </Paragraph>
      </Block>
    </Layout>
  );
}

NewProductRequestTemplateReact.PreviewProps = {
  ...NEW_PRODUCT_REQUEST_TEMPLATE_TEST_PROPS,
};

NewProductRequestTemplateReact.Text = NewProductRequestTemplateText;

NewProductRequestTemplateReact.Subject = 'New Product Request';
