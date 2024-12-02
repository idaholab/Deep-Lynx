
type MultiSelectProps = {
    options: string[];
};


export default function MultiSelect({ options }: MultiSelectProps) {

    return (
        < details className="dropdown dropdown-top" >
            <summary className="btn m-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                    <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Zm-3.75 9.75a.75.75 0 0 1 1.06 0L12 17.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>

            </summary>
            <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 drop-shadow-lg">
                {options.map((option, index) => (
                    <li key={index}>
                        <a>
                            <label className="label cursor-pointer">
                            <input type="checkbox" className="checkbox border-solid border-strokeGray [--chkbg:theme(colors.cherenkov)]" />
                                <span className="label-text capitalize pl-2">{option}</span>
                            </label>
                        </a>
                    </li>
                ))}
            </ul>
        </details >
    )
}