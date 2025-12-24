type Role = 'INVESTOR' | 'BUSINESS_OWNER' | 'ADMIN';

type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OfflineUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  kycStatus?: KycStatus;
  phone?: string;
}

type StoredUser = OfflineUser & {
  passwordHash: string;
};

const USERS_KEY = 'offline_users_v1';

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `offline_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hashPassword = async (password: string) => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(password);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return toHex(new Uint8Array(digest));
    }
  } catch {
  }
  return `plain:${password}`;
};

const loadUsers = (): StoredUser[] => {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
};

const saveUsers = (users: StoredUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const makeAxiosLikeError = (message: string) => {
  const err: any = new Error(message);
  err.response = { data: { message } };
  return err;
};

const withoutPassword = (u: StoredUser): OfflineUser => {
  const { passwordHash: _passwordHash, ...rest } = u;
  return rest;
};

export const offlineAuth = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: Role;
  }) => {
    const users = loadUsers();
    const email = data.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === email)) {
      throw makeAxiosLikeError('Email already registered (offline mode).');
    }

    const user: StoredUser = {
      id: generateId(),
      email,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role,
      kycStatus: 'NOT_SUBMITTED',
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
    };

    users.push(user);
    saveUsers(users);

    const token = `offline.${user.id}.${Date.now()}`;

    return {
      success: true,
      message: 'Registration successful (offline mode).',
      data: {
        user: withoutPassword(user),
        token,
      },
    };
  },

  login: async (email: string, password: string) => {
    const users = loadUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      throw makeAxiosLikeError('Invalid email or password (offline mode).');
    }

    const inputHash = await hashPassword(password);
    if (user.passwordHash !== inputHash) {
      throw makeAxiosLikeError('Invalid email or password (offline mode).');
    }

    const token = `offline.${user.id}.${Date.now()}`;

    return {
      success: true,
      message: 'Login successful (offline mode).',
      data: {
        user: withoutPassword(user),
        token,
      },
    };
  },

  getProfile: async () => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      throw makeAxiosLikeError('Not authenticated (offline mode).');
    }

    try {
      const user = JSON.parse(rawUser) as OfflineUser;
      return { success: true, data: { user } };
    } catch {
      throw makeAxiosLikeError('Invalid stored session (offline mode).');
    }
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      throw makeAxiosLikeError('Not authenticated (offline mode).');
    }

    const current = JSON.parse(rawUser) as OfflineUser;
    const users = loadUsers();

    const idx = users.findIndex((u) => u.id === current.id);
    if (idx === -1) {
      throw makeAxiosLikeError('User not found (offline mode).');
    }

    const updated: StoredUser = {
      ...users[idx],
      firstName: data.firstName ?? users[idx].firstName,
      lastName: data.lastName ?? users[idx].lastName,
      phone: data.phone ?? users[idx].phone,
    };

    users[idx] = updated;
    saveUsers(users);

    const publicUser = withoutPassword(updated);
    localStorage.setItem('user', JSON.stringify(publicUser));

    return { success: true, data: { user: publicUser } };
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      throw makeAxiosLikeError('Not authenticated (offline mode).');
    }

    const current = JSON.parse(rawUser) as OfflineUser;
    const users = loadUsers();

    const idx = users.findIndex((u) => u.id === current.id);
    if (idx === -1) {
      throw makeAxiosLikeError('User not found (offline mode).');
    }

    const currentHash = await hashPassword(currentPassword);
    if (users[idx].passwordHash !== currentHash) {
      throw makeAxiosLikeError('Current password is incorrect (offline mode).');
    }

    users[idx] = {
      ...users[idx],
      passwordHash: await hashPassword(newPassword),
    };

    saveUsers(users);
    return { success: true, message: 'Password updated (offline mode).' };
  },
};
