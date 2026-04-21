import React from 'react';

import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface RowContextProps {
    setActivatorNodeRef?: (element: HTMLElement | null) => void;
    listeners?: SyntheticListenerMap;
}

const RowContext = React.createContext<RowContextProps>({});

export default RowContext;