import { RegisterForm } from '../components/RegisterForm';

export const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
};
