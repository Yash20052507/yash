// src/pages/skillpacks/MySkillPacksPage.tsx
import React, { useEffect, useState } from 'react';
import { useSkillPackStore } from '../../store/skillPackStore';
import { SkillPack, Task } from '../../types';
import { PlusIcon, PencilIcon, SparklesIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom'; // For navigation to edit/create pages

// Placeholder for a modal or separate form for creating/editing skill packs
// For now, actions will be simulated with alerts.

const UserSkillPackItem: React.FC<{
    pack: SkillPack,
    onEdit: (id:string) => void,
    onGenerateEmbeddings: (id:string) => void,
    onDelete: (id:string) => void,
    isGeneratingEmbeddings: boolean // To show loading state on this specific pack
}> = ({pack, onEdit, onGenerateEmbeddings, onDelete, isGeneratingEmbeddings}) => (
    <div className="bg-white dark:bg-neutral-800 shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex-grow">
            <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 flex items-center">
                {pack.name}
                <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200">
                    v{pack.version}
                </span>
                {pack.is_public ?
                    <EyeIcon className="h-4 w-4 text-green-500 ml-2" title="Public"/> :
                    <EyeSlashIcon className="h-4 w-4 text-neutral-500 ml-2" title="Private"/>
                }
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2">{pack.description || "No description."}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Downloads: {pack.download_count} | Rating: {pack.rating?.toFixed(1) || 'N/A'} | Credits: {pack.price_credits === 0 ? "Free" : pack.price_credits}
            </p>
            {/* Optionally show embedding status if available on SkillPack type from store */}
            {/* <p className="text-xs text-neutral-500 dark:text-neutral-400">Embedding Status: {pack.embedding_status || 'Not generated'}</p> */}
        </div>
        <div className="flex space-x-2 flex-shrink-0 pt-2 sm:pt-0">
             <button
                onClick={() => onGenerateEmbeddings(pack.id)}
                title="Generate/Update Embeddings"
                disabled={isGeneratingEmbeddings}
                className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 rounded-md hover:bg-purple-100 dark:hover:bg-purple-700 disabled:opacity-50 disabled:cursor-wait"
            >
                {isGeneratingEmbeddings ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div> : <SparklesIcon className="h-5 w-5"/>}
            </button>
            <button onClick={() => onEdit(pack.id)} title="Edit Skill Pack" className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-700">
                <PencilIcon className="h-5 w-5"/>
            </button>
             <button onClick={() => onDelete(pack.id)} title="Delete Skill Pack" className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-700">
                <TrashIcon className="h-5 w-5"/>
            </button>
        </div>
    </div>
);

const MySkillPacksPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    userOwnedSkillPacks, fetchUserSkillPacks,
    isLoadingUserPacks, error,
    triggerEmbeddingsGeneration, deleteSkillPack
  } = useSkillPackStore();

  const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});


  useEffect(() => {
    fetchUserSkillPacks();
  }, [fetchUserSkillPacks]);

  const handleCreateNew = () => {
      alert("Create new skill pack form/modal to be implemented.");
      // navigate('/my-skill-packs/create'); // Example route
  };

  const handleEdit = (id: string) => {
      alert(`Edit skill pack ${id} - form/modal to be implemented.`);
      // navigate(`/my-skill-packs/edit/${id}`); // Example route
  };

  const handleGenerateEmbeddings = async (id: string) => {
      setGeneratingMap(prev => ({ ...prev, [id]: true }));
      try {
        const task: Task | null = await triggerEmbeddingsGeneration(id);
        if (task) {
            alert(`Embedding generation started for ${id}. Task ID: ${task.id}. Check task status for progress.`);
            // Optionally navigate to task page or show task progress here
        } else {
            alert(`Failed to start embedding generation for ${id}.`);
        }
      } catch (e: any) {
        alert(`Error triggering embedding generation: ${e.message}`);
      } finally {
        setGeneratingMap(prev => ({ ...prev, [id]: false }));
      }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this skill pack and all its content? This action cannot be undone.")) {
        const success = await deleteSkillPack(id);
        if (success) {
            alert("Skill pack deleted successfully.");
            // List will re-render due to store update
        } else {
            alert("Failed to delete skill pack.");
        }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-4 sm:mb-0">My Skill Packs</h1>
        <button onClick={handleCreateNew} className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 shadow-sm hover:shadow-md transition-all">
            <PlusIcon className="h-5 w-5 mr-2"/> Create New Skill Pack
        </button>
      </div>

      {isLoadingUserPacks && <p className="text-center py-8">Loading your skill packs...</p>}
      {error && <p className="text-center text-red-500 py-8">Error loading skill packs: {error}</p>}

      {!isLoadingUserPacks && userOwnedSkillPacks.length === 0 && !error && (
        <div className="text-center text-neutral-500 dark:text-neutral-400 text-lg py-10 bg-white dark:bg-neutral-800 rounded-lg shadow">
            <CubeIcon className="h-16 w-16 mx-auto mb-4 opacity-30"/>
            You haven't created or acquired any skill packs yet.
            <button onClick={handleCreateNew} className="mt-4 block mx-auto text-primary-600 hover:underline dark:text-primary-400">
                Create your first skill pack!
            </button>
        </div>
      )}

      <div className="space-y-4">
        {userOwnedSkillPacks.map((pack) => (
          <UserSkillPackItem
            key={pack.id}
            pack={pack}
            onEdit={handleEdit}
            onGenerateEmbeddings={handleGenerateEmbeddings}
            onDelete={handleDelete}
            isGeneratingEmbeddings={generatingMap[pack.id] || false}
          />
        ))}
      </div>
    </div>
  );
};
export default MySkillPacksPage;
