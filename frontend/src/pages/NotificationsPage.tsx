/**
 * Notifications Page for InvestGhanaHub
 * View and manage all notifications
 */

import { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const typeIcons = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

const typeColors = {
  INFO: 'text-blue-400 bg-blue-400/10',
  SUCCESS: 'text-ghana-green-500 bg-ghana-green-500/10',
  WARNING: 'text-ghana-gold-500 bg-ghana-gold-500/10',
  ERROR: 'text-red-400 bg-red-400/10',
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${API_URL}/notifications?unreadOnly=${filter === 'unread'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-ghana-gold-500" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm bg-ghana-gold-500 text-dark-950 px-2 py-1 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-dark-400">Stay updated on your investments</p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-ghana-gold-500 text-dark-950 font-medium'
                : 'text-dark-400 hover:bg-dark-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'unread'
                ? 'bg-ghana-gold-500 text-dark-950 font-medium'
                : 'text-dark-400 hover:bg-dark-800'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="card text-center py-16">
            <Bell className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications</h3>
            <p className="text-dark-400">
              {filter === 'unread' 
                ? "You're all caught up!" 
                : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const colorClass = typeColors[notification.type];
              
              return (
                <div
                  key={notification.id}
                  className={`card p-4 transition-all ${
                    !notification.isRead ? 'border-l-4 border-l-ghana-gold-500' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold ${!notification.isRead ? 'text-white' : 'text-dark-300'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-dark-400 text-sm mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-dark-500 whitespace-nowrap">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-dark-500 px-2 py-1 bg-dark-800 rounded">
                          {notification.category}
                        </span>
                        
                        {notification.link && (
                          <Link
                            to={notification.link}
                            className="text-xs text-ghana-gold-500 hover:text-ghana-gold-400 flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        
                        <div className="flex-1" />
                        
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-dark-400 hover:text-ghana-green-500 p-1"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-dark-400 hover:text-red-400 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

