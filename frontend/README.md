# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Aureum artwork verification

Open `/verify` to search the live artwork registry by public artwork ID or wallet address. The page lists current artwork IDs as quick searches, including artworks associated with incoming and outgoing transfers. Artwork IDs may be the database ID, the blockchain ID, the displayed `AUR-...` ID, or a registered binding reference.

The QR tab can scan a certificate QR with a supported browser camera or decode an uploaded QR image. Each verification record includes a QR code that links back to that artwork. Wallet searches include current and historical custody records associated with the supplied wallet.

The verification result distinguishes blockchain-confirmed provenance from a database-only registry record; a database record is not presented as cryptographically verified.

After sign-in, the dashboard role is loaded from the authenticated user's application profile: collectors open the Collector Vault and institutions/authenticators open the Institution Portal.
