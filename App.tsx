import React from 'react';
import Gallery from './components/Gallery';

const App: React.FC = () => {
    // The user ID is hardcoded as per the requirements for this specific app instance.
    return <Gallery userId="lasher" />;
};

export default App;