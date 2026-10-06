import React, { useState } from 'react';
import { Modal } from '../Common/Modal';
import { api } from '../../services/api';
import { useProject } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';
import { Upload } from 'lucide-react';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectImportModal: React.FC<ProjectImportModalProps> = ({ isOpen, onClose }) => {
  const { refreshProjects, setActiveProject } = useProject();
  const { addToast } = useToast();

  const [jsonText, setJsonText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) {
      setError('Please provide JSON bundle text or upload a file.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const bundle = JSON.parse(jsonText.trim());

      const importedProject = await api.projects.import(bundle);
      addToast('success', `Project "${importedProject.name}" imported successfully!`);
      await refreshProjects();
      setActiveProject(importedProject);
      setJsonText('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid project bundle JSON.');
      addToast('error', err.message || 'Project import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Project Bundle">
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            style={{ fontSize: 13 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Or Paste Project Bundle JSON
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder='{"version": "1.0", "project": { "name": "Imported Workspace" }, "tasks": [...] }'
            rows={8}
            className="form-input"
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <Upload size={14} />
            {isSubmitting ? 'Importing...' : 'Import Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
