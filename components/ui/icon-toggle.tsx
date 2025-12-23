import { useState } from 'react';
import { BookmarkIcon, Icon, StarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface IconToggleProps {
  isStarred: boolean;
  onToggle: () => Promise<void>;
  size?: 'small' | 'default';
  icon?: 'star' | 'bookmark';
}

export function IconToggle({
  isStarred,
  onToggle,
  size = 'default',
  icon = 'star',
}: IconToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle();
    } catch (error) {
      console.error('Error toggling star status:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle star status.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const iconSizeClass = size === 'small' ? 'size-3' : 'size-4';

  var Icon, starredClass;
  switch (icon) {
    case 'star':
      Icon = StarIcon;
      starredClass = 'text-yellow-600 fill-yellow-500';
      break;
    case 'bookmark':
      Icon = BookmarkIcon;
      starredClass = 'text-blue-600 fill-blue-500';
      break;
    default:
      Icon = StarIcon;
      starredClass = 'text-muted-600 fill-yellow-500';
      break;
  }

  return (
    <div onClick={handleToggle} className="focus:outline-hidden">
      <Icon
        className={`${iconSizeClass} ${isStarred ? starredClass : 'text-muted-foreground'}`}
      />
    </div>
  );
}
