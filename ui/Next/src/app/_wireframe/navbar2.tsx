
// Styles
import { classes } from "../styles";

// Store
import { useAppSelector } from "@/lib/store/hooks";
import Profile from "./profile";

export default function Navbar2() {
    const container = useAppSelector((state) => state.container.container);

    return (
        <>
            <div className="fixed top-0 left-0 w-full bg-darkBlue flex justify-between items-center max-h-16">
                <div className="flex-none pl-6">
                    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                        <image href="/lynx-white.png" x="0" y="0" height="120px" width="120px" />
                    </svg>
                </div>
                <Profile/>
            </div>
        </>
    );
}
