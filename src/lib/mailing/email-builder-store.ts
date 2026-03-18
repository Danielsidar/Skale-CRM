import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  EmailBlock, 
  EmailTemplateJSON, 
  EmailBlockType, 
  DEFAULT_BLOCK_STYLES, 
  DEFAULT_BODY_STYLES 
} from '@/types/email-builder';

interface EmailBuilderStore {
  template: EmailTemplateJSON;
  selectedBlockId: string | null;
  history: EmailTemplateJSON[];
  historyIndex: number;

  setTemplate: (template: EmailTemplateJSON) => void;
  selectBlock: (id: string | null) => void;
  addBlock: (type: EmailBlockType, index?: number) => void;
  updateBlock: (id: string, updates: Partial<EmailBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  updateBodyStyles: (updates: Partial<EmailTemplateJSON['body']['styles']>) => void;
  
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

const initialTemplate: EmailTemplateJSON = {
  body: {
    styles: DEFAULT_BODY_STYLES,
    blocks: [],
  },
};

export const useEmailBuilderStore = create<EmailBuilderStore>((set, get) => ({
  template: initialTemplate,
  selectedBlockId: null,
  history: [initialTemplate],
  historyIndex: 0,

  setTemplate: (template) => set({ template }),
  selectBlock: (id) => {
    set({ selectedBlockId: id });
  },

  addBlock: (type, index) => {
    const { template, saveHistory } = get();
    const newBlock: EmailBlock = {
      id: uuidv4(),
      type,
      content: getInitialContent(type),
      styles: { ...DEFAULT_BLOCK_STYLES, textAlign: 'right' },
    };

    const newBlocks = [...template.body.blocks];
    if (typeof index === 'number') {
      newBlocks.splice(index, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    set({
      template: {
        ...template,
        body: {
          ...template.body,
          blocks: newBlocks,
        },
      },
      selectedBlockId: newBlock.id,
    });
    saveHistory();
  },

  updateBlock: (id, updates) => {
    const { template, saveHistory } = get();
    const newBlocks = template.body.blocks.map((block) =>
      block.id === id ? { ...block, ...updates } : block
    );

    set({
      template: {
        ...template,
        body: {
          ...template.body,
          blocks: newBlocks,
        },
      },
    });
    // Don't save history on every keystroke if it's content update, 
    // maybe we should debounce this in the future
    saveHistory();
  },

  removeBlock: (id) => {
    const { template, selectedBlockId, saveHistory } = get();
    const newBlocks = template.body.blocks.filter((block) => block.id !== id);

    set({
      template: {
        ...template,
        body: {
          ...template.body,
          blocks: newBlocks,
        },
      },
      selectedBlockId: selectedBlockId === id ? null : selectedBlockId,
    });
    saveHistory();
  },

  moveBlock: (fromIndex, toIndex) => {
    const { template, saveHistory } = get();
    const newBlocks = [...template.body.blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);

    set({
      template: {
        ...template,
        body: {
          ...template.body,
          blocks: newBlocks,
        },
      },
    });
    saveHistory();
  },

  updateBodyStyles: (updates) => {
    const { template, saveHistory } = get();
    set({
      template: {
        ...template,
        body: {
          ...template.body,
          styles: { ...template.body.styles, ...updates },
        },
      },
    });
    saveHistory();
  },

  saveHistory: () => {
    const { template, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(template)));

    // Limit history size to 50
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      set({
        template: JSON.parse(JSON.stringify(history[prevIndex])),
        historyIndex: prevIndex,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        template: JSON.parse(JSON.stringify(history[nextIndex])),
        historyIndex: nextIndex,
      });
    }
  },
}));

function getInitialContent(type: EmailBlockType) {
  switch (type) {
    case 'text':
      return { html: '<p>טקסט חדש...</p>' };
    case 'button':
      return { text: 'לחץ כאן', url: 'https://' };
    case 'image':
      return { url: '', alt: 'תמונה' };
    case 'divider':
      return {};
    case 'spacer':
      return { height: 20 };
    case 'social':
      return { links: [] };
    case 'html':
      return { html: '<div>HTML מותאם אישית</div>' };
    default:
      return {};
  }
}
