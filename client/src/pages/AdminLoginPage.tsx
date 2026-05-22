import { useNavigate } from 'react-router-dom';
import { SignInDialog } from '@/components/map/SignInDialog';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  return (
    <SignInDialog
      open
      onOpenChange={(open) => {
        if (!open) navigate('/');
      }}
    />
  );
}
