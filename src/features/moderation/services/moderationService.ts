export type BlockedUser = {
  id: string;
  name: string;
  username: string;
  avatar: number | null;
  status: 'online' | 'offline';
  statusColor: string;
};

const blockedUsers: BlockedUser[] = [
  {
    id: 'rohit',
    name: 'Rohit Singh',
    username: 'rohit.s',
    avatar: require('../../../assets/images/onboarding/onboarding-card-3.png'),
    status: 'online',
    statusColor: '#21D477',
  },
  {
    id: 'karan',
    name: 'Karan Mehta',
    username: 'karan.m',
    avatar: require('../../../assets/images/avatars/alex.jpg'),
    status: 'offline',
    statusColor: '#86909D',
  },
  {
    id: 'sneha',
    name: 'Sneha Patel',
    username: 'sneha.p',
    avatar: require('../../../assets/images/onboarding/onboarding-card-1.png'),
    status: 'online',
    statusColor: '#1699F5',
  },
  {
    id: 'unknown',
    name: 'Unknown User',
    username: 'user123',
    avatar: null,
    status: 'offline',
    statusColor: '#86909D',
  },
];

export const getBlockedUsers = (): BlockedUser[] => blockedUsers.map(user => ({ ...user }));

export const unblockUser = (userId: string): BlockedUser[] => {
  const index = blockedUsers.findIndex(user => user.id === userId);
  if (index >= 0) {
    blockedUsers.splice(index, 1);
  }
  return getBlockedUsers();
};