import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LoginButton = () => {
    const { loginWithRedirect } = useAuth0();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <img src="/src/assets/logo.png" alt="VER5S" style={{ width: '250px', marginBottom: '30px' }} />
            <button onClick={() => loginWithRedirect()}>Log In</button>
        </div>
    );
};

export default LoginButton;
