import { Column, Heading, Link, Row } from '@react-email/components';
import { format } from 'date-fns';
import React from 'react';
import { GetStartedFormDto } from 'src/landing/dto/get-started-form.dto';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';

interface NewLandingFormLeadProps {
  timestamp: Date;
  formData: Omit<GetStartedFormDto, 'turnstileToken'>;
}

export default function NewLandingFormLeadTemplateReact({
  timestamp,
  formData,
}: NewLandingFormLeadProps): React.ReactElement {
  const rowData = [
    { label: 'Timestamp', value: format(timestamp, 'PPpp zzzz') },
    { label: 'Name', value: `${formData.firstName} ${formData.lastName}` },
    { label: 'Company Name', value: formData.companyName },
    {
      label: 'Email',
      value: <Link href={`mailto:${formData.email}`}>{formData.email}</Link>,
    },
    {
      label: 'Phone',
      value: <Link href={`tel:${formData.phone}`}>{formData.phone}</Link>,
    },
    { label: 'Message', value: formData.message || <>&mdash;</> },
  ];

  return (
    <Layout preview={`Lead submitted from ${formData.companyName}`}>
      <Block>
        <Heading className="text-base">Shield - New Landing Form Lead</Heading>
        <Paragraph>Hi,</Paragraph>
        <Paragraph>
          A submission has been made on the FC Safety Shield landing page.
        </Paragraph>
        <Heading className="text-sm">Here are the details:</Heading>
        {rowData.map(({ label, value }) => (
          <Row key={label} className="text-sm h-8">
            <Column
              align="left"
              className="w-1/4 bg-gray-100 px-2 py-1 font-bold"
            >
              {label}
            </Column>
            <Column align="left" className="w-3/4 px-2 py-1">
              {value}
            </Column>
          </Row>
        ))}
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

NewLandingFormLeadTemplateReact.Text = ({
  timestamp,
  formData,
}: NewLandingFormLeadProps) => {
  return `
  Hi,

  A submission has been made on the FC Safety Shield landing page.

  Here are the details:

  Timestamp: ${format(timestamp, 'PPpp zzzz')}
  Name: ${formData.firstName} ${formData.lastName}
  Company Name: ${formData.companyName}
  Email: ${formData.email}
  Phone: ${formData.phone}
  Message: ${formData.message || '–'}

  Regards,

  Shield Team
  FC Safety
  `;
};

NewLandingFormLeadTemplateReact.Sms = ({
  formData,
}: NewLandingFormLeadProps) => {
  return `SHIELD: New lead from ${formData.firstName} ${formData.lastName} (${formData.companyName}) - ${formData.email} - ${formData.phone}`;
};

NewLandingFormLeadTemplateReact.Subject = 'Shield - New Landing Form Lead';
NewLandingFormLeadTemplateReact.PreviewProps = {
  timestamp: new Date(),
  formData: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    companyName: 'Example Inc.',
    phone: '(123) 456-7890',
    message: `Hi, my name is John Doe and I am interested in your services.
    I came across your website and I think it's a great idea. Your solution
    seems like a great fit for my company.`,
  },
} satisfies NewLandingFormLeadProps;
