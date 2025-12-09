import { motion } from 'framer-motion';

interface PasswordStrengthMeterProps {
    password?: string;
}

export default function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return 0;

        if (pass.length > 6) score += 1;
        if (pass.length > 10) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        return score;
    };

    const strength = calculateStrength(password);

    const getColor = (score: number) => {
        if (score === 0) return 'bg-zinc-700';
        if (score <= 2) return 'bg-red-500';
        if (score <= 3) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getLabel = (score: number) => {
        if (score === 0) return 'Enter password';
        if (score <= 2) return 'Weak';
        if (score <= 3) return 'Medium';
        return 'Strong';
    };

    return (
        <div className="space-y-2 mt-2">
            <div className="flex gap-1 h-1">
                {[1, 2, 3, 4, 5].map((level) => (
                    <motion.div
                        key={level}
                        initial={false}
                        animate={{
                            backgroundColor: strength >= level ? getColor(strength) : '#3f3f46' // zinc-700
                        }}
                        className={`h-full flex-1 rounded-full`}
                    />
                ))}
            </div>
            <p className="text-[10px] text-right font-mono text-zinc-500 uppercase tracking-wider">
                {getLabel(strength)}
            </p>
        </div>
    );
}
