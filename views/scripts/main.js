const loading = () => {
    const loadingScreen = document.getElementById('loadingScreen')
    loadingScreen.style.visibility = 'visible';
    loadingScreen.style.display = 'grid';
}
const doneLoading = () => {
    const loadingScreen = document.getElementById('loadingScreen')
    loadingScreen.style.visibility = 'hidden';
    loadingScreen.style.display = 'none';
}