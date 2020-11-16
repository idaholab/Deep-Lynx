/* tslint:disable:variable-name */
// Config is a singleton class representing the application's configuration and
// environment at time of original construction. If at all possible, all properties
// should have sane defaults assigned.
import * as path from "path";
import * as fs from "fs";

export class Config {
  private static instance: Config;

  private _root_address: string;
  private readonly _email_address: string;
  private readonly _email_enabled: boolean = true;

  private readonly _email_validation_url: string;
  private readonly _email_validation_enforced: boolean;
  private readonly _reset_password_url: string;
  private readonly _container_invite_url: string;

  private readonly _template_dir: string;
  private readonly _asset_dir: string;

  private readonly _is_windows: boolean;

  private readonly _cache_provider: string;

  private readonly _mongo_source_uri : string;
  private readonly _mongo_source_db : string;

  private readonly _core_db_connection_string: string;
  private readonly _db_name: string;
  private readonly _session_secret: string;
  private readonly _encryption_key_path: string | undefined;
  private readonly _encryption_key_secret: string // secret if no key file is present

  private readonly _file_storage_method: string;
  private readonly _filesystem_storage_directory: string
  private readonly _azure_blob_connection_string: string
  private readonly _azure_blob_container_name: string

  private readonly _server_port: string;
  private readonly _log_level: string;

  private readonly  _basic_user: string;
  private readonly _basic_password: string;
  private readonly  _auth_strategy: string;

  private readonly _initial_superuser: boolean;
  private readonly _superuser_email: string;
  private readonly _superuser_password: string;

  private readonly _saml_enabled: boolean;
  private readonly _saml_adfs_entry_point: string;
  private readonly _saml_adfs_issuer: string;
  private readonly _saml_adfs_callback: string;
  private readonly _saml_adfs_private_cert_path: string | undefined;
  private readonly _saml_adfs_public_cert_path: string | undefined;

  private readonly _auth_config_file: string;
  private readonly _auth_token_expiry: string;

  private readonly _data_source_processing_interval: number;
  private readonly _data_source_processing_batch_size: number;


  private readonly _smtp_username: string;
  private readonly _smtp_password: string;
  private readonly _smtp_host: string;
  private readonly _smtp_port: number;
  private readonly _smtp_tls: boolean = true;
  private readonly _smtp_client_id: string;
  private readonly _smtp_client_secret: string;
  private readonly _smtp_refresh_token: string;
  private readonly _smtp_access_token: string;

  private constructor() {
    // Either assign a sane default of the env var is missing, or create your
    // own checks on process.env. There is most likely a more elegant way but
    // I like including sane defaults in the app itself vs. an env-sample file

    this._root_address = process.env.ROOT_ADDRESS || "http://localhost:8090"
    this._email_address = process.env.EMAIL_ADDRESS || "do+not+reply@deeplynx.org"
    this._email_enabled = process.env.EMAIL_ENABLED === "true"

    this._email_validation_url = process.env.EMAIL_VALIDATION_URL || ""
    this._email_validation_enforced = process.env.EMAIL_VALIDATION_ENFORCED === "true"
    this._reset_password_url = process.env.PASSWORD_RESET_URL || ""
    this._container_invite_url = process.env.CONTAINER_INVITE_URL || ""

    // we could simply have whatever needs to know if its windows access the platform
    // part of process, but I'd rather keep all configuration and accessing of process
    // here in the config file.
    this._is_windows = process.platform === 'win32'

    this._cache_provider = process.env.CACHE_PROVIDER || "memory"

    this._mongo_source_uri= process.env.MONGO_SOURCE_URI || "localhost:8081";
    this._mongo_source_db = process.env.MONGO_SOURCE_DB || "inl-core-m";

    this._core_db_connection_string = process.env.CORE_DB_CONNECTION_STRING || "";
    this._db_name = process.env.DB_NAME || "deep_lynx";

    this._template_dir = process.env.TEMPLATE_DIR || "./dist/api/views"
    this._asset_dir = process.env.ASSET_DIR || "./dist/assets"

    this._encryption_key_path = process.env.ENCRYPTION_KEY_PATH;
    this._encryption_key_secret = process.env.ENCRYPTION_KEY_SECRET || ""

    this._file_storage_method = process.env.FILE_STORAGE_METHOD || "filesystem"
    this._filesystem_storage_directory = process.env.FILESYSTEM_STORAGE_DIRECTORY || ""
    this._azure_blob_connection_string = process.env.AZURE_BLOB_CONNECTION_STRING || ""
    this._azure_blob_container_name = process.env.AZURE_BLOB_CONTAINER_NAME || "deep-lynx"

    this._server_port = process.env.SERVER_PORT || "8090";
    this._log_level = process.env.LOG_LEVEL || "debug";
    this._session_secret = process.env.SESSION_SECRET || "changeme";
    this._basic_user = process.env.BASIC_USER || "";
    this._basic_password = process.env.BASIC_PASSWORD || "";
    this._auth_strategy = process.env.AUTH_STRATEGY || "";

    this._initial_superuser = process.env.INITIAL_SUPERUSER === "true";
    this._superuser_email = process.env.SUPERUSER_EMAIL || "admin@admin.com";
    this._superuser_password = process.env.SUPERUSER_PASSWORD || "";

    this._saml_adfs_entry_point = process.env.SAML_ADFS_ENTRY_POINT || "";
    this._saml_adfs_issuer = process.env.SAML_ADFS_ISSUER || "";
    this._saml_adfs_callback = process.env.SAML_ADFS_CALLBACK || "http://localhost:8090/oauth/saml";
    this._saml_adfs_private_cert_path = process.env.SAML_ADFS_PRIVATE_CERT_PATH
    this._saml_adfs_public_cert_path = process.env.SAML_ADFS_PUBLIC_CERT_PATH
    this._saml_enabled = process.env.SAML_ENABLED === "true"
    this._auth_config_file = process.env.AUTH_CONFIG_FILE_PATH || path.resolve(__dirname, '../src/user_management/authorization/auth_model.conf');
    this._auth_token_expiry = process.env.AUTH_TOKEN_EXPIRY || "24h"

    this._data_source_processing_interval = (process.env.DATA_SOURCE_PROCESSING_INTERVAL) ? parseInt(process.env.DATA_SOURCE_PROCESSING_INTERVAL!, 10) : 10000
    this._data_source_processing_batch_size = (process.env.DATA_SOURCE_PROCESSING_BATCH_SIZE) ? parseInt(process.env.DATA_SOURCE_PROCESSING_BATCH_SIZE!, 10) : 1000

    this._smtp_username = process.env.SMTP_USERNAME || ""
    this._smtp_password = process.env.SMTP_PASSWORD || ""
    this._smtp_host = process.env.SMTP_HOST || ""
    this._smtp_port = (process.env.SMTP_PORT) ? parseInt(process.env.SMTP_PORT, 10) : 25;
    this._smtp_tls = process.env.SMTP_TLS === "true"
    this._smtp_client_id= process.env.SMTP_CLIENT_ID || ""
    this._smtp_client_secret = process.env.SMTP_CLIENT_SECRET || ""
    this._smtp_refresh_token = process.env.SMTP_REFRESH_TOKEN || ""
    this._smtp_access_token = process.env.SMTP_ACCESS_TOKEN || ""
  }

  get root_address(): string {
    return this._root_address;
  }

  get template_dir(): string {
    return this._template_dir;
  }

  get asset_dir(): string {
    return this._asset_dir;
  }

  get email_address(): string {
    return this._email_address;
  }

  get email_enabled(): boolean {
    return this._email_enabled;
  }

  get email_validation_enforced(): boolean {
    return this._email_validation_enforced
  }

  get container_invite_url(): string {
    return this._container_invite_url
  }

  get is_windows(): boolean {
    return this._is_windows;
  }

  get cache_provider(): string {
    return this._cache_provider
  }

  get server_port(): string {
    return this._server_port;
  }

  get core_db_connection_string(): string {
    return this._core_db_connection_string;
  }

  get db_name(): string {
    return this._db_name;
  }

  get file_storage_method(): string {
    return this._file_storage_method;
  }

  get filesystem_storage_directory(): string {
    return this._filesystem_storage_directory
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
    return this._superuser_email
  }

  get superuser_password(): string {
    return this._superuser_password;
  }

  get data_source_poll_interval(): number {
    return this._data_source_processing_interval;
  }

  get data_source_batch_size(): number {
    return this._data_source_processing_batch_size;
  }

  get session_secret(): string {
    return this._session_secret
  }

  // this will either return a reading of the .key file, or a plaintext secret
  // as determined by whether or not the environment variables were set correctly
  get encryption_key_secret(): Buffer {
    if(this._encryption_key_path) return fs.readFileSync(this._encryption_key_path)

    return Buffer.from(this._encryption_key_secret, 'utf8')
  }

  get encryption_key_path(): string {
    return this._encryption_key_path!
  }

  get mongo_source_uri(): string {
      return this._mongo_source_uri
  }

  get mongo_source_db(): string {
    return this._mongo_source_db
  }

  get log_level(): string {
    return this._log_level
  }

  get basic_user(): string {
    return this._basic_user
  }

  get basic_password(): string {
    return this._basic_password
  }

  get auth_strategy(): string {
    return this._auth_strategy
  }

  get saml_enabled(): boolean {
    return this._saml_enabled
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
    return this._saml_adfs_private_cert_path

  }

  get saml_adfs_public_cert_path(): string | undefined {
    return this._saml_adfs_public_cert_path
  }

  get smtp_username(): string {
    return this._smtp_username
  }

  get smtp_password(): string {
    return this._smtp_password
  }

  get smtp_host(): string {
    return this._smtp_host
  }

  get smtp_tls(): boolean {
    return this._smtp_tls
  }

  get smtp_port(): number{
    return this._smtp_port
  }

  get smtp_client_id(): string {
    return this._smtp_client_id
  }

  get smtp_client_secret(): string {
    return this._smtp_client_secret
  }

  get smtp_refresh_token(): string {
    return this._smtp_refresh_token
  }

  get smtp_access_token(): string {
    return this._smtp_access_token
  }

  get auth_config_file(): string {
    return this._auth_config_file
  }

  public static Instance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    return Config.instance;
  }
}

export default Config.Instance();
