import { Users } from 'lucide-react';
import useStore from '../store/useStore';

export default function UserList() {
  const users = useStore((s) => s.users);
  const userId = useStore((s) => s.userId);

  return (
    <div className="glass absolute top-4 right-4 w-52 max-h-96 overflow-y-auto p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3 text-white/90 font-semibold text-sm">
        <Users size={16} />
        <span>在线用户</span>
      </div>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="animate-fade-in flex items-center gap-2 text-white/80 text-sm">
            <span
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.color }}
            />
            <span className="truncate">
              {user.name}
              {user.id === userId && ' (你)'}
            </span>
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
          </li>
        ))}
      </ul>
    </div>
  );
}
