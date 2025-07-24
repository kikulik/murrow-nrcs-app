// src/features/auth/AuthPage.jsx
import React, { useState } from 'react';
import CustomIcon from '../../components/ui/CustomIcon';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import { PERMISSIONS } from '../../lib/permissions';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { email, password, name, role } = e.target.elements;

        try {
            if (isLogin) {
                await login(email.value, password.value);
            } else {
                await register(email.value, password.value, name.value, role.value);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center space-x-3 mb-8">
                    <div className="w-16 h-16 flex items-center justify-center">
                        <CustomIcon name="logo" size={64} />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Murrow NRCS</h1>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-center mb-2">
                        {isLogin ? 'Log In' : 'Register'}
                    </h2>
                    <p className="text-center text-gray-500 mb-6">
                        {isLogin ? "Welcome back!" : "Create your account to get started."}
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <>
                                <InputField label="Full Name" name="name" type="text" required />
                                <SelectField
                                    label="Profession"
                                    name="role"
                                    required
                                    options={Object.keys(PERMISSIONS).map(p => ({ value: p, label: p }))}
                                />
                            </>
                        )}
                        <InputField label="Email Address" name="email" type="email" required />
                        <InputField label="Password" name="password" type="password" required />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full btn-primary" disabled={loading}>
                            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:underline">
                            {isLogin ? "Don't have an account? Register" : "Already have an account? Log In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
