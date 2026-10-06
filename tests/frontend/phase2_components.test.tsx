// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { ProjectImportModal } from '../../apps/web/src/components/Projects/ProjectImportModal.js';
import { api } from '../../apps/web/src/services/api.js';

// Context mocks
const mockAddToast = vi.fn();
const mockRefreshProjects = vi.fn().mockResolvedValue(undefined);
const mockSetActiveProject = vi.fn();

vi.mock('../../apps/web/src/context/ToastContext.js', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('../../apps/web/src/context/ProjectContext.js', () => ({
  useProject: () => ({
    projects: [],
    activeProject: null,
    isLoading: false,
    setActiveProject: mockSetActiveProject,
    refreshProjects: mockRefreshProjects,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }),
}));

function setNativeValue(element: HTMLElement, value: string) {
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    (element as any).value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('TaskForge Phase 2 Frontend Components Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  it('renders ProjectImportModal when isOpen is true with textarea, instructions, and buttons', () => {
    const root = createRoot(container);
    const onCloseMock = vi.fn();

    root.render(<ProjectImportModal isOpen={true} onClose={onCloseMock} />);

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          expect(container.textContent).toContain('Import Project Bundle');
          expect(container.textContent).toContain('Or Paste Project Bundle JSON');
          expect(container.querySelector('textarea')).not.toBeNull();
          expect(container.querySelector('input[type="file"]')).not.toBeNull();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 50);
    });
  });

  it('shows error validation message when user submits empty JSON text', () => {
    const root = createRoot(container);
    const onCloseMock = vi.fn();

    root.render(<ProjectImportModal isOpen={true} onClose={onCloseMock} />);

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          const form = container.querySelector('form');
          expect(form).not.toBeNull();
          form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

          setTimeout(() => {
            try {
              expect(container.textContent).toContain('Please provide JSON bundle text or upload a file.');
              expect(onCloseMock).not.toHaveBeenCalled();
              resolve();
            } catch (err) {
              reject(err);
            }
          }, 50);
        } catch (err) {
          reject(err);
        }
      }, 50);
    });
  });

  it('shows parse error when user submits malformed JSON text', () => {
    const root = createRoot(container);
    const onCloseMock = vi.fn();

    root.render(<ProjectImportModal isOpen={true} onClose={onCloseMock} />);

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          const textarea = container.querySelector('textarea');
          expect(textarea).not.toBeNull();
          if (textarea) {
            setNativeValue(textarea, '{ malformed json: not valid }');
          }

          setTimeout(() => {
            try {
              const form = container.querySelector('form');
              form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

              setTimeout(() => {
                try {
                  expect(container.textContent).toContain('Expected property name');
                  expect(onCloseMock).not.toHaveBeenCalled();
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }, 50);
            } catch (err) {
              reject(err);
            }
          }, 50);
        } catch (err) {
          reject(err);
        }
      }, 50);
    });
  });

  it('successfully triggers api.projects.import and calls onClose when valid JSON is submitted', () => {
    const root = createRoot(container);
    const onCloseMock = vi.fn();
    const importedSample = {
      id: 'prj_imported',
      name: 'Imported Cloud App',
      description: 'Imported workspace',
      color: '#6366f1',
      is_archived: 0,
      owner_id: 'usr_owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(api.projects, 'import').mockResolvedValueOnce(importedSample as any);

    root.render(<ProjectImportModal isOpen={true} onClose={onCloseMock} />);

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          const textarea = container.querySelector('textarea');
          if (textarea) {
            setNativeValue(
              textarea,
              JSON.stringify({
                version: '1.0.0',
                project: { name: 'Imported Cloud App' },
                tasks: [{ title: 'Imported Task 1' }],
              })
            );
          }

          setTimeout(() => {
            try {
              const form = container.querySelector('form');
              form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

              setTimeout(() => {
                try {
                  expect(api.projects.import).toHaveBeenCalled();
                  expect(mockAddToast).toHaveBeenCalledWith('success', expect.stringContaining('Imported Cloud App'));
                  expect(mockRefreshProjects).toHaveBeenCalled();
                  expect(mockSetActiveProject).toHaveBeenCalledWith(importedSample);
                  expect(onCloseMock).toHaveBeenCalled();
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }, 100);
            } catch (err) {
              reject(err);
            }
          }, 50);
        } catch (err) {
          reject(err);
        }
      }, 50);
    });
  });
});
