import { Dispatch, SetStateAction } from "react";
import { useState } from 'react';

export default function ProfileQuerySettings({
    howManyPostsProfile,
    setHowManyPostsProfile,
    fromBlockProfile,
    setFromBlockProfile,
    toBlockProfile,
    setToBlockProfile
}: {
    howManyPostsProfile: number,
    setHowManyPostsProfile: Dispatch<SetStateAction<number>>,
    fromBlockProfile: number,
    setFromBlockProfile: Dispatch<SetStateAction<number>>,
    toBlockProfile: number,
    setToBlockProfile: Dispatch<SetStateAction<number>>
}) {
    const [visibleProfileSettings, setVisibleProfileSettings] = useState(false);

    const showProfilesSettings = () => setVisibleProfileSettings(!visibleProfileSettings);

    return (
        <div className="m-2">
            <button className="hover:underline" onClick={showProfilesSettings}>
                {'-> Profiles'}
            </button>
            {visibleProfileSettings && (
                <div className="text-s">
                    <div className="mt-4">
                        <label className="p-2">Posts per request:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={howManyPostsProfile}
                            onChange={e => setHowManyPostsProfile(Number(e.target.value))}
                            min={1} max={100}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">From block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={fromBlockProfile}
                            onChange={e => setFromBlockProfile(Number(e.target.value))}
                            min={24_402} max={1000_000_000}>
                        </input>
                    </div>
                    <div className="mt-4">
                        <label className="p-2">To block:</label>
                        <input className="text-right border-4 shadow-md" type="number"
                            defaultValue={toBlockProfile}
                            onChange={e => setToBlockProfile(Number(e.target.value))}
                            min={24_403} max={1000_000_000}>
                        </input>
                    </div>
                </div>
            )}
        </div>
    );
}