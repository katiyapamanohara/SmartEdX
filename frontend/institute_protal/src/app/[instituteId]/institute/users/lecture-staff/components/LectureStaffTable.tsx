import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Image from "next/image";
import { PencilIcon, TrashBinIcon } from "@/icons";

interface LectureStaffTableProps {
  users: any[];
  onEdit: (user: any) => void;
  onDelete: (userId: string) => Promise<void> | void;
  onToggleStatus?: (userId: string) => Promise<void> | void;
  loading?: boolean;
}

const LectureStaffTable: React.FC<LectureStaffTableProps> = ({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  loading,
}) => {
  const [actionLoading, setActionLoading] = React.useState<{ [key: string]: string | null }>({});

  const handleAction = async (userId: string, actionType: 'delete' | 'toggle', actionFn: () => Promise<void>) => {
    setActionLoading(prev => ({ ...prev, [userId]: actionType }));
    try {
      await actionFn();
    } catch (error) {
      console.error(`Failed to ${actionType} user`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index} className="animate-pulse">
                    <TableCell className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex flex-col gap-1">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></TableCell>
                    <TableCell className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div></TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                   <TableCell className="px-5 py-4 text-center text-gray-500" colSpan={4}>No lecture staff found.</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors duration-200">
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        {user.profilePicture ? (
                          <Image width={40} height={40} src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-gray-500 text-sm font-bold">{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{user.firstName} {user.lastName}</span>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{typeof user.role === 'object' ? user.role?.name : user.role}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{user.email}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <label className={`inline-flex items-center cursor-pointer ${actionLoading[user.id] === 'toggle' ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={user.isActive}
                        disabled={!!actionLoading[user.id]}
                        onChange={() => onToggleStatus && handleAction(user.id, 'toggle', () => onToggleStatus(user.id) as any)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                      <span className={`ms-3 text-sm font-medium ${user.isActive ? 'text-green-500' : 'text-gray-900 dark:text-gray-300'}`}>
                        {actionLoading[user.id] === 'toggle' ? 'Updating...' : user.isActive ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-end text-theme-sm dark:text-gray-400">
                    <div className="flex items-center justify-end gap-2">
                  
                      <button
                        onClick={() => handleDeleteUserWrapper(user.id)}
                        className={`p-2 text-gray-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-full transition-colors ${actionLoading[user.id] === 'delete' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Delete User"
                        disabled={!!actionLoading[user.id]}
                      >
                         {actionLoading[user.id] === 'delete' ? (
                            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                         ) : (
                            <TrashBinIcon className="w-5 h-5" />
                         )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
  
  function handleDeleteUserWrapper(userId: string) {
      if (onDelete && confirm("Are you sure you want to delete this staff member?")) {
        handleAction(userId, 'delete', () => onDelete(userId) as any);
      }
  }
};
         
export default LectureStaffTable;
