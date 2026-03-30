"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { notificationService, Notification } from "@/services/notificationService";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { authService } from "@/services/authService";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

function TypeIcon({ type }: { type: Notification["type"] }) {
  if (type === "message") {
    return (
      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-blue-500" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (type === "reminder") {
    return (
      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-orange-500" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  // email
  return (
    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

interface Props {
  instituteId: string;
}

export default function NotificationDropdown({ instituteId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const token = authService.getToken();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const data = await notificationService.getNotifications(instituteId);
    setNotifications(data);
    setLoading(false);
  }, [instituteId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time: prepend new notifications
  useNotificationSocket(token, (notif) => {
    setNotifications((prev) => [notif, ...prev]);
  });

  const handleOpen = async () => {
    setIsOpen(true);
    // Mark all as read when dropdown is opened
    if (unreadCount > 0 && instituteId) {
      await notificationService.markAllAsRead(instituteId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const handleClose = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleOpen}
      >
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 z-10 flex items-center justify-center h-4 w-4 rounded-full bg-orange-400 text-white text-[10px] font-bold">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={handleClose}
        className="absolute -right-60 mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-orange-400 rounded-full">
                {unreadCount}
              </span>
            )}
          </h5>
          <button
            onClick={handleClose}
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {loading && (
            <li className="flex items-center justify-center py-10 text-sm text-gray-400">
              Loading…
            </li>
          )}
          {!loading && notifications.length === 0 && (
            <li className="flex flex-col items-center justify-center py-10 text-sm text-gray-400 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="opacity-40" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875Z" fill="currentColor"/>
              </svg>
              No notifications yet
            </li>
          )}
          {!loading && notifications.map((notif) => (
            <li key={notif.id}>
              <DropdownItem
                onItemClick={handleClose}
                className={`flex gap-3 rounded-lg border-b border-gray-100 px-3 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 transition-colors ${
                  !notif.isRead ? "bg-orange-50 dark:bg-orange-900/10" : ""
                }`}
              >
                <TypeIcon type={notif.type} />
                <span className="block min-w-0">
                  <span className="mb-0.5 block text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {notif.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {notif.body}
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-gray-400 text-[11px] dark:text-gray-500">
                    <span className="capitalize">{notif.type}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span>{timeAgo(notif.createdAt)}</span>
                    {!notif.isRead && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    )}
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
