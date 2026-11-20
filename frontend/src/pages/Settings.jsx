import { Navigate } from 'react-router-dom';

export default function Settings() {
  return <Navigate to="/profile?tab=settings" replace />;
}
