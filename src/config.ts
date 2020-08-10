/* tslint:disable:variable-name */
// Config is a singleton class representing the application's configuration and
// environment at time of original construction. If at all possible, all properties
// should have sane defaults assigned.
import * as path from "path";
import * as fs from "fs";

export class Config {
  private static instance: Config;

  private readonly _is_windows: boolean;

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

  private readonly _saml_adfs_entry_point: string;
  private readonly _saml_adfs_issuer: string;
  private readonly _saml_adfs_callback: string;
  private readonly _saml_adfs_private_cert_path: string | undefined;
  private readonly _saml_adfs_public_cert_path: string | undefined;

  private readonly _auth_config_file: string;
  private readonly _auth_token_expiry: string;

  private readonly _data_source_processing_interval: number;
  private readonly _data_source_processing_batch_size: number;

  private constructor() {
    // Either assign a sane default of the env var is missing, or create your
    // own checks on process.env. There is most likely a more elegant way but
    // I like including sane defaults in the app itself vs. an env-sample file

    // we could simply have whatever needs to know if its windows access the platform
    // part of process, but I'd rather keep all configuration and accessing of process
    // here in the config file.
    this._is_windows = process.platform === 'win32'

    this._mongo_source_uri= process.env.MONGO_SOURCE_URI || "localhost:8081";
    this._mongo_source_db = process.env.MONGO_SOURCE_DB || "inl-core-m";

    this._core_db_connection_string = process.env.CORE_DB_CONNECTION_STRING || "";
    this._db_name = process.env.DB_NAME || "";

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
    this._saml_adfs_callback = process.env.SAML_ADFS_CALLBACK || "http://localhost:8090/login";
    this._saml_adfs_private_cert_path = process.env.SAML_ADFS_PRIVATE_CERT_PATH
    this._saml_adfs_public_cert_path = process.env.SAML_ADFS_PUBLIC_CERT_PATH
    this._auth_config_file = process.env.AUTH_CONFIG_FILE_PATH || path.resolve(__dirname, '../src/user_management/authorization/auth_model.conf');
    this._auth_token_expiry = process.env.AUTH_TOKEN_EXPIRY || "24h"

    this._data_source_processing_interval = (process.env.DATA_SOURCE_PROCESSING_INTERVAL) ? parseInt(process.env.DATA_SOURCE_PROCESSING_INTERVAL!, 10) : 10000
    this._data_source_processing_batch_size = (process.env.DATA_SOURCE_PROCESSING_BATCH_SIZE) ? parseInt(process.env.DATA_SOURCE_PROCESSING_BATCH_SIZE!, 10) : 1000
  }

  get is_windows(): boolean {
    return this._is_windows
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
