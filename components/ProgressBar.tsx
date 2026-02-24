import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
    progress: number; // 0 to 100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const [visible, setVisible] = useState(false);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (progress > 0 && progress < 100) {
            setVisible(true);
            setWidth(progress);
        } else if (progress === 100) {
            setWidth(100);
            const timeout = setTimeout(() => {
                setVisible(false);
                setTimeout(() => setWidth(0), 400);
            }, 500);
            return () => clearTimeout(timeout);
        } else {
            setVisible(false);
            setWidth(0);
        }
    }, [progress]);

    if (!visible && width === 0) return null;

    return (
        <div className={`fixed top-0 left-0 w-full h-0.5 z-[9999] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div
                className="h-full bg-gradient-to-r from-primary-light via-primary to-primary-dark transition-all duration-300 ease-out shadow-[0_0_10px_rgba(45,90,39,0.3)]"
                style={{ width: `${width}%` }}
            />
        </div>
    );
};

export default ProgressBar;
