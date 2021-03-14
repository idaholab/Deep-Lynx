import {Client} from "@/api/client";
import {Authentication} from "@/auth/authentication_service";

declare module 'vue/types/vue' {
    interface Vue {
        $client: Client // covers the client plugin's custom type
        $auth: Authentication // covers the authentication's plugin custom type
    }
}
