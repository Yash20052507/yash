// src/pages/profile/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService'; // For API keys, transactions
import { ApiKey, Transaction, User, UpdateUserProfilePayload } from '../../types';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { EyeIcon, EyeSlashIcon, KeyIcon, CreditCardIcon, UserCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().email("Invalid email address"),
});
type ProfileFormInputs = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});
type PasswordFormInputs = z.infer<typeof passwordSchema>;


const ProfilePage: React.FC = () => {
  const { user, fetchCurrentUser, isLoading: authLoading } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);

  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [showNewApiKey, setShowNewApiKey] = useState<string | null>(null);


  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfileForm, formState: { errors: profileErrors, isSubmitting: isSubmittingProfile } } = useForm<ProfileFormInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username || '', email: user?.email || '' }
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPasswordForm, formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword } } = useForm<PasswordFormInputs>({
    resolver: zodResolver(passwordSchema)
  });


  useEffect(() => {
    if (user) {
      resetProfileForm({ username: user.username, email: user.email });
      fetchUserApiKeys();
      fetchUserTransactions();
    }
  }, [user, resetProfileForm]);

  const fetchUserApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const response = await userService.listApiKeys();
      if (response.success && response.data) setApiKeys(response.data);
    } catch (error) { console.error("Failed to fetch API keys", error); }
    finally { setIsLoadingApiKeys(false); }
  };

  const fetchUserTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await userService.listUserTransactions();
      if (response.success && response.data) setTransactions(response.data);
    } catch (error) { console.error("Failed to fetch transactions", error); }
    finally { setIsLoadingTransactions(false); }
  };

  const onProfileSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    try {
      const updatePayload: UpdateUserProfilePayload = {};
      if (data.username !== user?.username) updatePayload.username = data.username;
      if (data.email !== user?.email) updatePayload.email = data.email;

      if (Object.keys(updatePayload).length > 0) {
        const response = await userService.updateUserProfile(updatePayload);
        if (response.success) {
          fetchCurrentUser(); // Re-fetch user to update store
          alert("Profile updated successfully!");
          setEditMode(false);
        } else {
          alert(`Profile update failed: ${response.error || response.message}`);
        }
      } else {
        setEditMode(false); // No changes made
      }
    } catch (error: any) {
      alert(`An error occurred: ${error.message}`);
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormInputs> = async (data) => {
    try {
      const response = await userService.updateUserProfile({ password: data.newPassword }); // Backend needs to handle currentPassword check
      if (response.success) {
        alert("Password changed successfully!");
        setChangePasswordMode(false);
        resetPasswordForm();
      } else {
         alert(`Password change failed: ${response.error || response.message || 'Check current password.'}`);
      }
    } catch (error: any) {
      alert(`An error occurred: ${error.message}`);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newApiKeyName.trim()) {
        alert("Please provide a name for the API key.");
        return;
    }
    try {
        const response = await userService.generateApiKey({ name: newApiKeyName });
        if (response.success && response.data) {
            setShowNewApiKey(response.data.apiKey || null); // Show the key once
            setNewApiKeyName('');
            fetchUserApiKeys(); // Refresh list
        } else {
            alert(`Failed to generate API key: ${response.error || response.message}`);
        }
    } catch (error: any) {
        alert(`Error generating API key: ${error.message}`);
    }
  };

  const handleDeleteApiKey = async (apiKeyId: string) => {
    if (window.confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
        try {
            await userService.deleteApiKey(apiKeyId);
            fetchUserApiKeys(); // Refresh list
        } catch (error: any) {
            alert(`Failed to delete API key: ${error.message}`);
        }
    }
  };


  if (authLoading && !user) { // Show loader only if user data is not yet available but auth is loading
    return <div className="p-6 text-center">Loading profile...</div>;
  }
  if (!user) {
    return <div className="p-6 text-center text-red-500">User not found. Please log in again.</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center space-x-3">
        <UserCircleIcon className="h-10 w-10 text-primary-600 dark:text-primary-400"/>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">My Profile</h1>
      </div>

      {/* User Information Section */}
      <section className="bg-white dark:bg-neutral-800 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Account Details</h2>
            {!changePasswordMode && (
                 <button onClick={() => setEditMode(!editMode)} className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 flex items-center">
                    <PencilIcon className="h-4 w-4 mr-1"/> {editMode ? 'Cancel' : 'Edit Profile'}
                </button>
            )}
        </div>
        {!editMode ? (
            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Credits:</strong> <span className="font-bold text-lg text-primary-600 dark:text-primary-400">{user.credits}</span></p>
              <p><strong>Admin Status:</strong> {user.is_admin ? 'Yes' : 'No'}</p>
              <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
               {!changePasswordMode && (
                <button onClick={() => setChangePasswordMode(true)} className="mt-3 text-xs text-secondary-600 hover:underline">Change Password</button>
               )}
            </div>
        ) : (
            <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Username</label>
                    <input id="username" type="text" {...registerProfile("username")} className={`mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${profileErrors.username ? 'border-red-500' : ''}`} />
                    {profileErrors.username && <p className="text-xs text-red-500 mt-1">{profileErrors.username.message}</p>}
                </div>
                 <div>
                    <label htmlFor="email" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                    <input id="email" type="email" {...registerProfile("email")} className={`mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${profileErrors.email ? 'border-red-500' : ''}`} />
                    {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email.message}</p>}
                </div>
                <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => {setEditMode(false); resetProfileForm({username: user.username, email: user.email});}} className="px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700">Cancel</button>
                    <button type="submit" disabled={isSubmittingProfile} className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">Save Changes</button>
                </div>
            </form>
        )}

        {changePasswordMode && (
             <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="mt-6 pt-6 border-t dark:border-neutral-700 space-y-4">
                <h3 className="text-md font-semibold text-neutral-800 dark:text-neutral-200">Change Password</h3>
                 {/* Current Password, New Password, Confirm New Password fields */}
                <div>
                    <label className="block text-xs font-medium">Current Password</label>
                    <input type="password" {...registerPassword("currentPassword")} className={`mt-1 block w-full rounded-md sm:text-sm ${passwordErrors.currentPassword ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700'}`} />
                    {passwordErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>}
                </div>
                <div>
                    <label className="block text-xs font-medium">New Password</label>
                    <input type="password" {...registerPassword("newPassword")} className={`mt-1 block w-full rounded-md sm:text-sm ${passwordErrors.newPassword ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700'}`} />
                    {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>}
                </div>
                <div>
                    <label className="block text-xs font-medium">Confirm New Password</label>
                    <input type="password" {...registerPassword("confirmNewPassword")} className={`mt-1 block w-full rounded-md sm:text-sm ${passwordErrors.confirmNewPassword ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700'}`} />
                    {passwordErrors.confirmNewPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmNewPassword.message}</p>}
                </div>
                <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => {setChangePasswordMode(false); resetPasswordForm();}} className="px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700">Cancel</button>
                    <button type="submit" disabled={isSubmittingPassword} className="px-3 py-1.5 text-xs bg-secondary-600 text-white rounded-md hover:bg-secondary-700 disabled:opacity-50">Update Password</button>
                </div>
            </form>
        )}
      </section>

      {/* API Keys Section */}
      <section className="bg-white dark:bg-neutral-800 shadow-xl rounded-lg p-6">
         <div className="flex items-center space-x-3 mb-4">
            <KeyIcon className="h-6 w-6 text-secondary-600 dark:text-secondary-400"/>
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">API Keys</h2>
        </div>
        {showNewApiKey && (
            <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-md">
                <p className="text-sm text-primary-700 dark:text-primary-200 font-medium">New API Key Generated:</p>
                <p className="mt-1 p-2 bg-neutral-100 dark:bg-neutral-700 rounded text-xs font-mono break-all">{showNewApiKey}</p>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">Please copy this key now. You will not be able to see it again.</p>
                <button onClick={() => setShowNewApiKey(null)} className="mt-2 text-xs text-primary-600 hover:underline">Dismiss</button>
            </div>
        )}
        <div className="flex items-center space-x-2 mb-4">
            <input type="text" value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} placeholder="New API Key Name"
                   className="flex-grow p-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600 text-sm focus:ring-primary-500 focus:border-primary-500"/>
            <button onClick={handleGenerateApiKey} className="px-4 py-2 bg-secondary-500 text-white text-sm rounded-md hover:bg-secondary-600 whitespace-nowrap">Generate Key</button>
        </div>
        {isLoadingApiKeys ? <p>Loading API keys...</p> : apiKeys.length > 0 ? (
            <ul className="space-y-2 text-sm">
                {apiKeys.map(key => (
                    <li key={key.id} className="p-2 border dark:border-neutral-700 rounded-md flex justify-between items-center">
                        <div>
                            <span className="font-medium dark:text-neutral-100">{key.name}</span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">(Created: {new Date(key.created_at).toLocaleDateString()})</span>
                        </div>
                        <button onClick={() => handleDeleteApiKey(key.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">Delete</button>
                    </li>
                ))}
            </ul>
        ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No API keys generated yet.</p>}
      </section>

      {/* Transaction History Section */}
      <section className="bg-white dark:bg-neutral-800 shadow-xl rounded-lg p-6">
         <div className="flex items-center space-x-3 mb-4">
            <CreditCardIcon className="h-6 w-6 text-green-600 dark:text-green-400"/>
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Transaction History</h2>
        </div>
        {isLoadingTransactions ? <p>Loading transactions...</p> : transactions.length > 0 ? (
            <ul className="space-y-2 text-sm divide-y divide-neutral-100 dark:divide-neutral-700">
                {transactions.map(tx => (
                    <li key={tx.id} className="py-2 flex justify-between items-center">
                        <div>
                            <p className="font-medium dark:text-neutral-100 capitalize">{tx.type.replace('_', ' ')}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{tx.description || `Ref: ${tx.reference_id || 'N/A'}`}</p>
                        </div>
                        <div className="text-right">
                            <p className={`font-semibold ${tx.amount_credits >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {tx.amount_credits >= 0 ? '+' : ''}{tx.amount_credits} Credits
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                    </li>
                ))}
            </ul>
        ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No transactions found.</p>}
      </section>
    </div>
  );
};
export default ProfilePage;
