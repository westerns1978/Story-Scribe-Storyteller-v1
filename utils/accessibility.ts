
export function enableElderlyMode() {
    document.documentElement.classList.add('elderly-mode');
    localStorage.setItem('gemynd_elderly_mode', 'enabled');
}

export function disableElderlyMode() {
    document.documentElement.classList.remove('elderly-mode');
    localStorage.setItem('gemynd_elderly_mode', 'disabled');
}

// FIX: Renamed from isElderlyModeEnabled to checkElderlyMode to satisfy App.tsx import
export function checkElderlyMode() {
    return localStorage.getItem('gemynd_elderly_mode') === 'enabled';
}