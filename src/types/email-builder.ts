export type EmailBlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social' | 'html';

export interface EmailBlockStyles {
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  marginTop?: number;
  marginBottom?: number;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  width?: string;
  height?: string;
}

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: any; // Block-specific content (e.g., text content, image URL, button label)
  styles: EmailBlockStyles;
}

export interface EmailBodyStyles {
  backgroundColor?: string;        // הרקע של כל הדף (המסגרת)
  contentBackgroundColor?: string; // הרקע של גוף המייל עצמו
  fontFamily?: string;
  width?: number; // e.g., 600
  paddingTop?: number;
  paddingBottom?: number;
}

export interface EmailTemplateJSON {
  body: {
    styles: EmailBodyStyles;
    blocks: EmailBlock[];
  };
}

export const DEFAULT_BLOCK_STYLES: EmailBlockStyles = {
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 20,
  paddingRight: 20,
  textAlign: 'right', // RTL by default
};

export const DEFAULT_BODY_STYLES: EmailBodyStyles = {
  backgroundColor: '#f1f5f9',
  contentBackgroundColor: '#ffffff',
  fontFamily: 'sans-serif',
  width: 600,
  paddingTop: 40,
  paddingBottom: 40,
};
