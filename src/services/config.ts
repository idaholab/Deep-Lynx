/* tslint:disable:variable-name */
import * as path from 'path';
import * as fs from 'fs';

/*
 Config is a singleton class representing the application's configuration and
 environment at time of original construction. If at all possible, all properties
 should have sane defaults assigned.
*/
export class Config {
    private static instance: Config;

    private _root_address: string;
    private _project_dir: string;
    private readonly _email_address: string;
    private readonly _email_enabled: boolean = true;

    private readonly _email_validation_enforced: boolean;
    private readonly _container_invite_url: string;

    private readonly _template_dir: string;
    private readonly _asset_dir: string;
    private readonly _web_gui_dir: string;

    private readonly _vue_app_id: string;

    private readonly _is_windows: boolean;

    private readonly _cache_provider: string;
    private readonly _cache_default_ttl: number;
    private readonly _cache_redis_connection_string: string;

    private readonly _core_db_connection_string: string;
    private readonly _session_secret: string;
    private readonly _encryption_key_path: string | undefined;

    private readonly _file_storage_method: string;
    private readonly _filesystem_storage_directory: string;
    private readonly _azure_blob_connection_string: string;
    private readonly _azure_blob_container_name: string;

    private readonly _vue_app_name: string;

    private readonly _server_port: string;
    private readonly _log_level: string;
    private readonly _max_request_body_size: string;

    private readonly _basic_user: string;
    private readonly _basic_password: string;
    private readonly _auth_strategy: string;

    private readonly _initial_superuser: boolean;
    private readonly _superuser_email: string;
    private readonly _superuser_password: string;

    private readonly _saml_enabled: boolean;
    private readonly _saml_adfs_entry_point: string;
    private readonly _saml_adfs_issuer: string;
    private readonly _saml_adfs_callback: string;
    private readonly _saml_adfs_claims_name: string;
    private readonly _saml_adfs_claims_email: string;
    private readonly _saml_adfs_private_cert_path: string | undefined;
    private readonly _saml_adfs_public_cert_path: string | undefined;

    private readonly _auth_config_file: string;
    private readonly _auth_token_expiry: string;

    private readonly _export_data_interval: string;
    private readonly _export_data_concurrency: number;

    private readonly _data_source_receive_buffer: number;
    private readonly _data_source_processing_interval: string;
    private readonly _edge_linker_interval: string;
    private readonly _data_source_processing_concurrency: number;
    private readonly _data_source_processing_batch_size: number;

    private readonly _queue_system: string;

    private readonly _smtp_username: string;
    private readonly _smtp_password: string;
    private readonly _smtp_host: string;
    private readonly _smtp_port: number;
    private readonly _smtp_tls: boolean = true;
    private readonly _smtp_client_id: string;
    private readonly _smtp_client_secret: string;
    private readonly _smtp_refresh_token: string;
    private readonly _smtp_access_token: string;

    private readonly _rsa_url: string;
    private readonly _rsa_client_key: string;
    private readonly _rsa_client_id: string;

    private readonly _hpc_email: string;

    private readonly _emit_events: boolean;
    private readonly _process_queue_name: string;
    private readonly _data_sources_queue_name: string;
    private readonly _events_queue_name: string;

    private readonly _rabbitmq_url: string;
    private readonly _azure_service_bus_connection_string: string;

    private constructor() {
        // Either assign a sane default of the env var is missing, or create your
        // own checks on process.env. There is most likely a more elegant way but
        // I like including sane defaults in the app itself vs. an env-sample file

        this._project_dir = process.env.PROJECT_DIR || './dist';
        this._root_address = process.env.ROOT_ADDRESS || 'http://localhost:8090';
        this._email_address = process.env.EMAIL_ADDRESS || 'do+not+reply@deeplynx.org';
        this._email_enabled = process.env.EMAIL_ENABLED === 'true';

        this._email_validation_enforced = process.env.EMAIL_VALIDATION_ENFORCED === 'true';
        this._container_invite_url = process.env.CONTAINER_INVITE_URL || '';

        // we could simply have whatever needs to know if its windows access the platform
        // part of process, but I'd rather keep all configuration and accessing of process
        // here in the config file.
        this._is_windows = process.platform === 'win32';

        this._cache_provider = process.env.CACHE_PROVIDER || 'memory';
        this._cache_default_ttl = process.env.CACHE_DEFAULT_TTL ? parseInt(process.env.CACHE_DEFAULT_TTL!, 10) : 21600;
        // default to a local, non-password-protected instance of redis
        this._cache_redis_connection_string = process.env.CACHE_REDIS_CONNECTION_STRING || '//localhost:6379';

        this._core_db_connection_string = process.env.CORE_DB_CONNECTION_STRING || '';

        this._template_dir = process.env.TEMPLATE_DIR || './dist/http_server/views';
        this._asset_dir = process.env.ASSET_DIR || './dist/http_server/assets';
        this._web_gui_dir = process.env.WEB_GUI_DIR || './dist/http_server/web_gui';

        this._vue_app_id = process.env.VUE_APP_DEEP_LYNX_APP_ID || '';

        this._encryption_key_path = process.env.ENCRYPTION_KEY_PATH;

        this._file_storage_method = process.env.FILE_STORAGE_METHOD || 'filesystem';
        this._filesystem_storage_directory = process.env.FILESYSTEM_STORAGE_DIRECTORY || '';
        this._azure_blob_connection_string = process.env.AZURE_BLOB_CONNECTION_STRING || '';
        this._azure_blob_container_name = process.env.AZURE_BLOB_CONTAINER_NAME || 'deep-lynx';

        this._vue_app_name = process.env.VUE_APP_NAME || 'Admin Web Interface';

        this._server_port = process.env.SERVER_PORT || '8090';
        this._log_level = process.env.LOG_LEVEL || 'debug';
        this._max_request_body_size = process.env.MAX_REQUEST_BODY_SIZE || '50000';
        this._session_secret = process.env.SESSION_SECRET || 'changeme';
        this._basic_user = process.env.BASIC_USER || '';
        this._basic_password = process.env.BASIC_PASSWORD || '';
        this._auth_strategy = process.env.AUTH_STRATEGY || '';

        this._initial_superuser = process.env.INITIAL_SUPERUSER === 'true';
        this._superuser_email = process.env.SUPERUSER_EMAIL || 'admin@admin.com';
        this._superuser_password = process.env.SUPERUSER_PASSWORD || '';

        this._saml_adfs_claims_name = process.env.SAML_ADFS_CLAIMS_NAME || '';
        this._saml_adfs_claims_email = process.env.SAML_ADFS_CLAIMS_EMAIL || '';
        this._saml_adfs_entry_point = process.env.SAML_ADFS_ENTRY_POINT || '';
        this._saml_adfs_issuer = process.env.SAML_ADFS_ISSUER || '';
        this._saml_adfs_callback = process.env.SAML_ADFS_CALLBACK || 'http://localhost:8090/oauth/saml';
        this._saml_adfs_private_cert_path = process.env.SAML_ADFS_PRIVATE_CERT_PATH;
        this._saml_adfs_public_cert_path = process.env.SAML_ADFS_PUBLIC_CERT_PATH;
        this._saml_enabled = process.env.SAML_ENABLED === 'true';
        this._auth_config_file =
            process.env.AUTH_CONFIG_FILE_PATH || path.resolve(__dirname, '../../src/domain_objects/access_management/authorization/auth_model.conf');
        this._auth_token_expiry = process.env.AUTH_TOKEN_EXPIRY || '24h';

        this._data_source_receive_buffer = process.env.DATA_SOURCE_RECEIVE_BUFFER ? parseInt(process.env.DATA_SOURCE_RECEIVE_BUFFER, 10) : 1000;
        this._data_source_processing_interval = process.env.DATA_SOURCE_PROCESSING_INTERVAL || '10s';
        this._edge_linker_interval = process.env.EDGE_LINKER_INTERVAL || '1m';
        this._data_source_processing_concurrency = process.env.DATA_SOURCE_PROCESSING_CONCURRENCY
            ? parseInt(process.env.DATA_SOURCE_PROCESSING_CONCURRENCY, 10)
            : 4;
        this._data_source_processing_batch_size = process.env.DATA_SOURCE_PROCESSING_BATCH_SIZE
            ? parseInt(process.env.DATA_SOURCE_PROCESSING_BATCH_SIZE!, 10)
            : 1000;

        this._export_data_interval = process.env.EXPORT_INTERVAL || '10m';
        this._export_data_concurrency = process.env.EXPORT_DATA_CONCURRENCY ? parseInt(process.env.EXPORT_DATA_CONCURRENCY, 10) : 4;

        this._queue_system = process.env.QUEUE_SYSTEM || 'database';

        this._smtp_username = process.env.SMTP_USERNAME || '';
        this._smtp_password = process.env.SMTP_PASSWORD || '';
        this._smtp_host = process.env.SMTP_HOST || '';
        this._smtp_port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 25;
        this._smtp_tls = process.env.SMTP_TLS === 'true';
        this._smtp_client_id = process.env.SMTP_CLIENT_ID || '';
        this._smtp_client_secret = process.env.SMTP_CLIENT_SECRET || '';
        this._smtp_refresh_token = process.env.SMTP_REFRESH_TOKEN || '';
        this._smtp_access_token = process.env.SMTP_ACCESS_TOKEN || '';

        this._rsa_url = process.env.RSA_URL || '';
        this._rsa_client_key = process.env.RSA_CLIENT_KEY || '';
        this._rsa_client_id = process.env.RSA_CLIENT_ID || 'DeepLynx';

        this._hpc_email = process.env.HPC_EMAIL || '';

        this._emit_events = process.env.EMIT_EVENTS === 'true' || false;
        this._process_queue_name = process.env.PROCESS_QUEUE_NAME || 'process';
        this._data_sources_queue_name = process.env.DATA_SOURCES_QUEUE_NAME || 'data_sources';
        this._events_queue_name = process.env.EVENTS_QUEUE_NAME || 'events';

        this._rabbitmq_url = process.env.RABBITMQ_URL || 'amqp://localhost';
        this._azure_service_bus_connection_string = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '';
    }

    get ssl_enabled(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    get root_address(): string {
        return this._root_address;
    }

    get project_dir(): string {
        return this._project_dir;
    }

    get template_dir(): string {
        return this._template_dir;
    }

    get asset_dir(): string {
        return this._asset_dir;
    }

    get web_gui_dir(): string {
        return this._web_gui_dir;
    }

    get email_address(): string {
        return this._email_address;
    }

    get email_enabled(): boolean {
        return this._email_enabled;
    }

    get email_validation_enforced(): boolean {
        return this._email_validation_enforced;
    }

    get container_invite_url(): string {
        return this._container_invite_url;
    }

    get is_windows(): boolean {
        return this._is_windows;
    }

    get cache_provider(): string {
        return this._cache_provider;
    }

    get cache_default_ttl(): number {
        return this._cache_default_ttl;
    }

    get redis_connection_string(): string {
        return this._cache_redis_connection_string;
    }

    get server_port(): string {
        return this._server_port;
    }

    get core_db_connection_string(): string {
        return this._core_db_connection_string;
    }

    get file_storage_method(): string {
        return this._file_storage_method;
    }

    get filesystem_storage_directory(): string {
        return this._filesystem_storage_directory;
    }

    get azure_blob_connection_string(): string {
        return this._azure_blob_connection_string;
    }

    get azure_blob_container_name(): string {
        return this._azure_blob_container_name;
    }

    get initial_super_user(): boolean {
        return this._initial_superuser;
    }

    get superuser_email(): string {
        return this._superuser_email;
    }

    get superuser_password(): string {
        return this._superuser_password;
    }

    get data_source_receive_buffer(): number {
        return this._data_source_receive_buffer;
    }

    get data_source_interval(): string {
        return this._data_source_processing_interval;
    }

    get edge_linker_interval(): string {
        return this._edge_linker_interval;
    }

    get data_source_concurrency(): number {
        return this._data_source_processing_concurrency;
    }

    get data_source_batch_size(): number {
        return this._data_source_processing_batch_size;
    }

    get admin_web_app_name(): string {
        return this._vue_app_name;
    }

    get export_data_interval(): string {
        return this._export_data_interval;
    }

    get export_data_concurrency(): number {
        return this._export_data_concurrency;
    }

    get queue_system(): string {
        return this._queue_system;
    }

    get session_secret(): string {
        return this._session_secret;
    }

    // this will either return a reading of the .key file, or a plaintext secret
    // as determined by whether or not the environment variables were set correctly
    get encryption_key_secret(): Buffer {
        if (this._encryption_key_path && this._encryption_key_path !== '') return fs.readFileSync(this._encryption_key_path);

        return Buffer.from('', 'utf8');
    }

    get log_level(): string {
        return this._log_level;
    }

    get max_request_body_size(): string {
        return this._max_request_body_size;
    }

    get basic_user(): string {
        return this._basic_user;
    }

    get basic_password(): string {
        return this._basic_password;
    }

    get auth_strategy(): string {
        return this._auth_strategy;
    }

    get saml_claims_name(): string {
        return this._saml_adfs_claims_name;
    }

    get saml_claims_email(): string {
        return this._saml_adfs_claims_email;
    }

    get saml_enabled(): boolean {
        return this._saml_enabled;
    }

    get saml_adfs_entry_point(): string {
        return this._saml_adfs_entry_point;
    }

    get saml_adfs_issuer(): string {
        return this._saml_adfs_issuer;
    }

    get saml_adfs_callback(): string {
        return this._saml_adfs_callback;
    }

    get saml_adfs_private_cert_path(): string | undefined {
        return this._saml_adfs_private_cert_path;
    }

    get saml_adfs_public_cert_path(): string | undefined {
        return this._saml_adfs_public_cert_path;
    }

    get smtp_username(): string {
        return this._smtp_username;
    }

    get smtp_password(): string {
        return this._smtp_password;
    }

    get smtp_host(): string {
        return this._smtp_host;
    }

    get smtp_tls(): boolean {
        return this._smtp_tls;
    }

    get smtp_port(): number {
        return this._smtp_port;
    }

    get smtp_client_id(): string {
        return this._smtp_client_id;
    }

    get smtp_client_secret(): string {
        return this._smtp_client_secret;
    }

    get smtp_refresh_token(): string {
        return this._smtp_refresh_token;
    }

    get smtp_access_token(): string {
        return this._smtp_access_token;
    }

    get auth_config_file(): string {
        return this._auth_config_file;
    }

    get rsa_url(): string {
        return this._rsa_url;
    }

    get rsa_client_key(): string {
        return this._rsa_client_key;
    }

    get rsa_client_id(): string {
        return this._rsa_client_id;
    }

    get vue_app_id(): string {
        return this._vue_app_id;
    }

    get hpc_email(): string {
        return this._hpc_email;
    }

    get process_queue(): string {
        return this._process_queue_name;
    }

    get events_queue(): string {
        return this._events_queue_name;
    }

    get data_sources_queue(): string {
        return this._data_sources_queue_name;
    }

    get rabbitmq_url(): string {
        return this._rabbitmq_url;
    }

    get azure_service_bus_connection(): string {
        return this._azure_service_bus_connection_string;
    }

    get emit_events(): boolean {
        return this._emit_events;
    }

    public static Instance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }

        return Config.instance;
    }
}

export default Config.Instance();
