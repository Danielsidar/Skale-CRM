import { EmailTemplateJSON, EmailBlock } from '@/types/email-builder';

export function generateEmailHTML(json: EmailTemplateJSON): string {
  const { body } = json;
  const { styles: bodyStyles, blocks } = body;

  const blocksHtml = blocks.map(renderBlock).join('\n');

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" dir="rtl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Template</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: ${bodyStyles.backgroundColor || '#f8fafc'};
      font-family: ${bodyStyles.fontFamily || 'sans-serif'};
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    .content-table {
      width: 100%;
      max-width: ${bodyStyles.width || 600}px;
    }
    @media only screen and (max-width: 600px) {
      .content-table {
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bodyStyles.backgroundColor || '#f8fafc'};">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${bodyStyles.backgroundColor || '#f8fafc'};">
    <tr>
      <td align="center" style="padding-top: ${bodyStyles.paddingTop || 40}px; padding-bottom: ${bodyStyles.paddingBottom || 40}px;">
        <table border="0" cellpadding="0" cellspacing="0" class="content-table" style="background-color: ${bodyStyles.contentBackgroundColor || '#ffffff'}; border-radius: 8px; overflow: hidden;">
          <tr>
            <td align="center">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function renderBlock(block: EmailBlock): string {
  const styles = block.styles;
  const content = block.content;

  const containerStyle = `
    padding-top: ${styles.paddingTop || 0}px;
    padding-bottom: ${styles.paddingBottom || 0}px;
    padding-left: ${styles.paddingLeft || 0}px;
    padding-right: ${styles.paddingRight || 0}px;
    background-color: ${styles.backgroundColor || 'transparent'};
    text-align: ${styles.textAlign || 'right'};
  `;

  switch (block.type) {
    case 'text':
      const textStyle = `
        color: ${styles.color || '#000000'};
        font-size: ${styles.fontSize || 16}px;
        font-weight: ${styles.fontWeight || 'normal'};
        line-height: ${styles.lineHeight || 1.5};
        margin: 0;
      `;
      return `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="${containerStyle}">
              <div style="${textStyle}">${content.html}</div>
            </td>
          </tr>
        </table>
      `;

    case 'button':
      const buttonStyle = `
        background-color: ${styles.backgroundColor || '#2563eb'};
        color: ${styles.color || '#ffffff'};
        padding: ${styles.paddingTop || 12}px ${styles.paddingLeft || 24}px;
        border-radius: ${styles.borderRadius || 8}px;
        font-size: ${styles.fontSize || 16}px;
        font-weight: bold;
        text-decoration: none;
        display: inline-block;
      `;
      return `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="${styles.textAlign || 'center'}" style="${containerStyle}">
              <a href="${content.url}" style="${buttonStyle}">${content.text}</a>
            </td>
          </tr>
        </table>
      `;

    case 'image':
      if (!content.url) return '';
      return `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="${styles.textAlign || 'center'}" style="${containerStyle}">
              <img src="${content.url}" alt="${content.alt || ''}" width="100%" style="display: block; border: 0; max-width: 100%; border-radius: ${styles.borderRadius || 0}px;" />
            </td>
          </tr>
        </table>
      `;

    case 'divider':
      const hrStyle = `
        border: 0;
        border-top: ${styles.borderWidth || 1}px ${styles.borderStyle || 'solid'} ${styles.borderColor || '#e2e8f0'};
        width: ${styles.width || '100%'};
        display: inline-block;
      `;
      return `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="${styles.textAlign || 'center'}" style="${containerStyle}">
              <hr style="${hrStyle}" />
            </td>
          </tr>
        </table>
      `;

    case 'spacer':
      return `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="height: ${content.height || 20}px; line-height: ${content.height || 20}px;">&nbsp;</td>
          </tr>
        </table>
      `;

    case 'html':
      return `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="${containerStyle}">
              ${content.html}
            </td>
          </tr>
        </table>
      `;

    default:
      return '';
  }
}
