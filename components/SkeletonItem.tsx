import React from 'react';

const SkeletonItem: React.FC = () => {
    return (
        <div className="aspect-square overflow-hidden bg-neutral-200">
            <div className="h-full w-full animate-pulse bg-[linear-gradient(135deg,#f5f5f5_0%,#e5e5e5_55%,#f5f5f5_100%)]" />
        </div>
    );
};

export default SkeletonItem;
