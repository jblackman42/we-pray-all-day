(async () => {
    const logoutBtnDOM = document.getElementById('logout-btn');
    const nav = document.querySelector('nav');
    if (!nav) return;

    const user = await axios({
        method: 'get',
        url: '/api/auth/user'
    })
        .then(response => response.data)

    if (!user) {
        console.log('not logged in')
        logoutBtnDOM.style.display = 'none';
        logoutBtnDOM.style.visibility = 'hidden';
        return
    }
})()