import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Step = "RECIPIENTS" | "DETAILS" | "TEMPLATE_CHOICE" | "DESIGN" | "REVIEW";

interface MailingWizardState {
  currentStep: Step;
  selectedListIds: string[];
  campaignName: string;
  subject: string;
  designMethod: "new" | "template";
  selectedTemplateId: string | null;
  emailJson: any;
  emailHtml: string;
  isDesigningExternally: boolean;
  builderUrl: string | null;

  // Actions
  setStep: (step: Step) => void;
  setSelectedListIds: (ids: string[]) => void;
  setCampaignName: (name: string) => void;
  setSubject: (subject: string) => void;
  setDesignMethod: (method: "new" | "template") => void;
  setSelectedTemplateId: (id: string | null) => void;
  setEmailJson: (json: any) => void;
  setEmailHtml: (html: string) => void;
  setIsDesigningExternally: (isDesigning: boolean, url?: string | null) => void;
  resetWizard: () => void;
}

const initialState = {
  currentStep: "RECIPIENTS" as Step,
  selectedListIds: [],
  campaignName: "",
  subject: "",
  designMethod: "new" as const,
  selectedTemplateId: null,
  emailJson: null,
  emailHtml: "",
  isDesigningExternally: false,
  builderUrl: null,
};

export const useMailingWizardStore = create<MailingWizardState>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),
      setSelectedListIds: (ids) => set({ selectedListIds: ids }),
      setCampaignName: (name) => set({ campaignName: name }),
      setSubject: (subject) => set({ subject: subject }),
      setDesignMethod: (method) => set({ designMethod: method }),
      setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
      setEmailJson: (json) => set({ emailJson: json }),
      setEmailHtml: (html) => set({ emailHtml: html }),
      setIsDesigningExternally: (isDesigning, url = null) => 
        set({ isDesigningExternally: isDesigning, builderUrl: url }),
      resetWizard: () => set(initialState),
    }),
    {
      name: 'mailing-wizard-storage',
    }
  )
);
