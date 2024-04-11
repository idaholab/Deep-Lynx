import {Client} from '@/api/client';
import {Authentication} from '@/auth/authentication_service';
import {ErrorHandler, RawLocation} from 'vue-router/types/router';
import {Utilities} from '@/utilities';

declare module 'vue/types/vue' {
    interface Vue {
        $client: Client; // covers the client plugin's custom type
        $auth: Authentication; // covers the authentication's plugin custom type
        $utils: Utilities;
    }
}
export declare class VueRouter {
    replace(location: RawLocation, onComplete?: Function, onAbort?: ErrorHandler): void;
}
