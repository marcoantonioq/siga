import { empresaAlterar } from "../infra/express/app/siga/empresaAlternar.js";

empresaAlterar({
    auth: {
        page: "<html>...</html>",
        cookies: "",
        antixsrftoken: ""
    },
    igreja: {
        UNIDADE_COD: "135",
        IGREJA_COD: "345"
    }
});