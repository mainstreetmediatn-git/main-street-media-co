import MainStreetWebAuthorityPage from "./MainStreetWebAuthorityPage"
import { WebAuthorityRoute } from "./WebAuthority"

export default function App() {
    const path = window.location.pathname

    if (path.startsWith("/web-authority")) {
        return <WebAuthorityRoute path={path} />
    }

    return <MainStreetWebAuthorityPage />
}
