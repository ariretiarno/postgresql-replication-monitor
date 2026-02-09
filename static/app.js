let currentTab = 'dashboard';
let autoRefreshInterval;

document.addEventListener('DOMContentLoaded', function() {
    refreshAll();
    autoRefreshInterval = setInterval(refreshAll, 10000);
});

async function refreshAll() {
    await fetchSummary();
    // Only refresh current tab if it's visible
    if (currentTab === 'dashboard' || currentTab === 'replication') {
        await showTab(currentTab);
    }
    document.getElementById('updateTime').textContent = new Date().toLocaleTimeString();
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function fetchSummary() {
    try {
        const response = await fetch('/api/summary');
        const data = await response.json();
        
        const healthStatus = document.getElementById('healthStatus');
        const statusColors = {
            'healthy': 'bg-green-500',
            'warning': 'bg-yellow-500',
            'critical': 'bg-red-500'
        };
        healthStatus.innerHTML = `
            <span class="h-3 w-3 rounded-full ${statusColors[data.health_status] || 'bg-gray-500'}"></span>
            <span class="text-sm font-medium capitalize">${data.health_status}</span>
        `;

        document.getElementById('summaryCards').innerHTML = `
            <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm">Total Databases</p>
                        <p class="text-3xl font-bold mt-1">${data.total_databases}</p>
                    </div>
                    <svg class="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7"/>
                    </svg>
                </div>
            </div>
            <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm">Publications</p>
                        <p class="text-3xl font-bold mt-1">${data.publication_count}</p>
                    </div>
                    <svg class="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                </div>
            </div>
            <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm">Subscriptions</p>
                        <p class="text-3xl font-bold mt-1">${data.subscription_count}</p>
                    </div>
                    <svg class="h-10 w-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                </div>
            </div>
            <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-slate-400 text-sm">Active Slots</p>
                        <p class="text-3xl font-bold mt-1">${data.active_slots}/${data.slot_count}</p>
                    </div>
                    <svg class="h-10 w-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/>
                    </svg>
                </div>
            </div>
        `;

        if (data.max_replay_lag || data.max_flush_lag || data.max_write_lag) {
            document.getElementById('lagInfo').innerHTML = `
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <h3 class="text-white font-semibold mb-3 flex items-center">
                        <svg class="h-5 w-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Maximum Replication Lags
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p class="text-slate-400 text-sm">Write Lag</p>
                            <p class="text-xl font-mono mt-1">${data.max_write_lag || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-sm">Flush Lag</p>
                            <p class="text-xl font-mono mt-1">${data.max_flush_lag || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-sm">Replay Lag</p>
                            <p class="text-xl font-mono mt-1">${data.max_replay_lag || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching summary:', error);
    }
}

function showTab(tabName) {
    currentTab = tabName;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('border-blue-500', 'text-blue-500');
            btn.classList.remove('border-transparent', 'text-slate-400');
        } else {
            btn.classList.remove('border-blue-500', 'text-blue-500');
            btn.classList.add('border-transparent', 'text-slate-400');
        }
    });

    switch(tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'replication': loadReplicationStats(); break;
        case 'publications': loadPublications(); break;
        case 'subscriptions': loadSubscriptions(); break;
        case 'slots': loadReplicationSlots(); break;
        case 'all-databases': loadAllDatabases(); break;
        case 'discrepancy': loadDiscrepancyCheck(); break;
    }
}

async function loadDashboard() {
    try {
        const [sourceLSN, targetLSN, databases] = await Promise.all([
            fetch('/api/lsn/source').then(r => r.json()),
            fetch('/api/lsn/target').then(r => r.json()),
            fetch('/api/databases').then(r => r.json())
        ]);

        const lagBytes = sourceLSN.current_lsn_bytes - targetLSN.current_lsn_bytes;

        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-slate-800/50 card border border-blue-500/30 rounded-lg p-6">
                        <div class="flex items-center space-x-2 mb-4">
                            <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-semibold">SOURCE</span>
                            <h3 class="text-lg font-semibold">Source Database (Unencrypted)</h3>
                        </div>
                        <div class="space-y-3">
                            <div><p class="text-slate-400 text-sm">Current LSN</p><p class="text-xl font-mono mt-1">${sourceLSN.current_lsn}</p></div>
                            <div><p class="text-slate-400 text-sm">LSN Bytes</p><p class="text-xl font-mono mt-1">${formatBytes(sourceLSN.current_lsn_bytes)}</p></div>
                            <div><p class="text-slate-400 text-sm">WAL Insert Position</p><p class="text-xl font-mono mt-1">${sourceLSN.wal_position}</p></div>
                        </div>
                    </div>
                    <div class="bg-slate-800/50 card border border-purple-500/30 rounded-lg p-6">
                        <div class="flex items-center space-x-2 mb-4">
                            <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded font-semibold">TARGET</span>
                            <h3 class="text-lg font-semibold">Target Database (Encrypted)</h3>
                        </div>
                        <div class="space-y-3">
                            <div><p class="text-slate-400 text-sm">Last Received LSN</p><p class="text-xl font-mono mt-1">${targetLSN.current_lsn}</p></div>
                            <div><p class="text-slate-400 text-sm">LSN Bytes</p><p class="text-xl font-mono mt-1">${formatBytes(targetLSN.current_lsn_bytes)}</p></div>
                            <div><p class="text-slate-400 text-sm">Last Replay Position</p><p class="text-xl font-mono mt-1">${targetLSN.wal_position}</p></div>
                        </div>
                    </div>
                </div>
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-3">Replication Lag</h3>
                    <div><p class="text-slate-400 text-sm">Lag in Bytes</p><p class="text-3xl font-mono mt-1">${formatBytes(lagBytes)}</p></div>
                </div>
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4">Databases (${databases.length})</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${databases.map(db => `<div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4"><p class="font-medium">${db.name}</p><p class="text-slate-400 text-sm">${db.size}</p></div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadReplicationStats() {
    try {
        const stats = await fetch('/api/replication-stats').then(r => r.json());
        
        if (!stats || stats.length === 0) {
            document.getElementById('tabContent').innerHTML = `
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-8 text-center">
                    <h3 class="text-xl font-semibold mb-2">No Active Replication</h3>
                    <p class="text-slate-400">No replication connections found.</p>
                </div>
            `;
            return;
        }

        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                    <div class="flex items-center space-x-2">
                        <svg class="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-orange-400 font-semibold">SOURCE DATABASE</span>
                        <span class="text-slate-400 text-sm">- Replication statistics from source showing data being sent to target</span>
                    </div>
                </div>
                <h2 class="text-2xl font-bold">Replication Statistics (${stats.length} Active)</h2>
                ${stats.map(stat => `
                    <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                        <div class="flex justify-between mb-4">
                            <div><h3 class="text-lg font-semibold">${stat.application_name}</h3><p class="text-sm text-slate-400">${stat.client_addr || 'Local'}</p></div>
                            <span class="px-3 py-1 rounded-full text-sm ${stat.state === 'streaming' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${stat.state}</span>
                        </div>
                        <div class="grid grid-cols-4 gap-4 mb-4">
                            <div><p class="text-slate-400 text-sm">Sent LSN</p><p class="font-mono text-sm">${stat.sent_lsn || 'N/A'}</p></div>
                            <div><p class="text-slate-400 text-sm">Write LSN</p><p class="font-mono text-sm">${stat.write_lsn || 'N/A'}</p></div>
                            <div><p class="text-slate-400 text-sm">Flush LSN</p><p class="font-mono text-sm">${stat.flush_lsn || 'N/A'}</p></div>
                            <div><p class="text-slate-400 text-sm">Replay LSN</p><p class="font-mono text-sm">${stat.replay_lsn || 'N/A'}</p></div>
                        </div>
                        <div class="pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
                            <div><p class="text-slate-400 text-sm">Write Lag</p><p class="font-mono text-lg">${stat.write_lag || '0'}</p></div>
                            <div><p class="text-slate-400 text-sm">Flush Lag</p><p class="font-mono text-lg">${stat.flush_lag || '0'}</p></div>
                            <div><p class="text-slate-400 text-sm">Replay Lag</p><p class="font-mono text-lg">${stat.replay_lag || '0'}</p></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading replication stats:', error);
    }
}

async function loadPublications() {
    try {
        const publications = await fetch('/api/publications').then(r => r.json());
        
        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div class="flex items-center space-x-2">
                        <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-blue-400 font-semibold">SOURCE DATABASE</span>
                        <span class="text-slate-400 text-sm">- Publications are created on the source (unencrypted) database</span>
                    </div>
                </div>
                <div class="flex justify-between"><h2 class="text-2xl font-bold">Publications by Database</h2><div class="font-semibold">Total: ${publications.length} databases</div></div>
                ${publications.length === 0 ? '<div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-8 text-center"><h3 class="text-xl font-semibold mb-2">No Publications Found</h3></div>' : 
                publications.map(pub => `
                    <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 transition-colors">
                        <div class="flex justify-between mb-4">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-1">
                                    <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-semibold">SOURCE</span>
                                    <h3 class="text-lg font-semibold">${pub.database}</h3>
                                </div>
                                <p class="text-sm text-slate-400">Replication Slot: ${pub.slot_name}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm ${pub.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                                ${pub.active ? '✓ Active' : '✗ Inactive'}
                            </span>
                        </div>
                        <div class="grid grid-cols-1 gap-2 text-sm">
                            <div class="bg-slate-900/50 rounded p-3">
                                <p class="text-slate-400 text-xs mb-1">Confirmed Flush LSN</p>
                                <p class="text-white font-mono">${pub.confirmed_lsn}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading publications:', error);
    }
}

async function loadSubscriptions() {
    try {
        const subscriptions = await fetch('/api/subscriptions').then(r => r.json());
        
        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <div class="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                    <div class="flex items-center space-x-2">
                        <svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-purple-400 font-semibold">TARGET DATABASE</span>
                        <span class="text-slate-400 text-sm">- Subscriptions are created on the target (encrypted) database</span>
                    </div>
                </div>
                <div class="flex justify-between"><h2 class="text-2xl font-bold">Subscriptions by Database</h2><div class="font-semibold">Total: ${subscriptions.length} databases</div></div>
                ${subscriptions.length === 0 ? '<div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-8 text-center"><h3 class="text-xl font-semibold mb-2">No Subscriptions Found</h3></div>' :
                subscriptions.map(sub => `
                    <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
                        <div class="flex justify-between mb-4">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-1">
                                    <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded font-semibold">TARGET</span>
                                    <h3 class="text-lg font-semibold">${sub.database}</h3>
                                </div>
                                <p class="text-sm text-slate-400">Replication Slot: ${sub.slot_name}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm ${sub.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                                ${sub.active ? '✓ Active' : '✗ Inactive'}
                            </span>
                        </div>
                        <div class="grid grid-cols-1 gap-2 text-sm">
                            <div class="bg-slate-900/50 rounded p-3">
                                <p class="text-slate-400 text-xs mb-1">Restart LSN</p>
                                <p class="text-white font-mono">${sub.restart_lsn}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

async function loadReplicationSlots() {
    try {
        const slots = await fetch('/api/replication-slots').then(r => r.json());
        
        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                    <div class="flex items-center space-x-2">
                        <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-green-400 font-semibold">SOURCE DATABASE</span>
                        <span class="text-slate-400 text-sm">- Replication slots are created on the source database for each subscription</span>
                    </div>
                </div>
                <div class="flex justify-between"><h2 class="text-2xl font-bold">Replication Slots</h2><div class="font-semibold">Total: ${slots.length} (${slots.filter(s => s.active).length} active)</div></div>
                ${slots.length === 0 ? '<div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-8 text-center"><h3 class="text-xl font-semibold mb-2">No Replication Slots Found</h3></div>' :
                slots.map(slot => `
                    <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                        <div class="flex justify-between mb-4">
                            <div><h3 class="text-lg font-semibold">${slot.slot_name}</h3><p class="text-sm text-slate-400">${slot.plugin} - ${slot.slot_type}</p></div>
                            <div class="flex items-center space-x-2">
                                <span class="px-3 py-1 rounded-full text-sm bg-slate-700">${slot.wal_status}</span>
                                <span class="px-3 py-1 rounded-full text-sm ${slot.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${slot.active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-4 gap-4">
                            <div><p class="text-slate-400 text-sm">Database</p><p class="font-medium">${slot.database}</p></div>
                            <div><p class="text-slate-400 text-sm">Restart LSN</p><p class="font-mono text-sm">${slot.restart_lsn || 'N/A'}</p></div>
                            <div><p class="text-slate-400 text-sm">Confirmed LSN</p><p class="font-mono text-sm">${slot.confirmed_flush_lsn || 'N/A'}</p></div>
                            <div><p class="text-slate-400 text-sm">Safe WAL Size</p><p class="font-mono text-sm">${formatBytes(slot.safe_wal_size)}</p></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading replication slots:', error);
    }
}

async function loadAllDatabases() {
    try {
        const details = await fetch('/api/databases/details').then(r => r.json());
        
        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold">All Databases Monitoring</h2>
                        <p class="text-slate-400">Individual status for each of the ${details.length} databases</p>
                    </div>
                    <div class="text-sm text-slate-400">
                        <span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span> Active
                        <span class="inline-block w-3 h-3 rounded-full bg-yellow-500 ml-3 mr-1"></span> Partial
                        <span class="inline-block w-3 h-3 rounded-full bg-red-500 ml-3 mr-1"></span> Inactive
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${details.map(db => {
                        const status = db.active_slots > 0 ? 'green' : (db.slot_count > 0 ? 'yellow' : 'red');
                        const statusText = db.active_slots > 0 ? 'Active' : (db.slot_count > 0 ? 'Partial' : 'No Replication');
                        return `
                            <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-1">
                                            <span class="w-3 h-3 rounded-full bg-${status}-500"></span>
                                            <h3 class="font-semibold text-white truncate">${db.name}</h3>
                                        </div>
                                        <p class="text-xs text-slate-400">${db.size}</p>
                                    </div>
                                    <span class="px-2 py-1 rounded text-xs font-medium bg-${status}-500/20 text-${status}-400 whitespace-nowrap ml-2">
                                        ${statusText}
                                    </span>
                                </div>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-slate-400">Publications:</span>
                                        <span class="font-medium ${db.has_publication ? 'text-green-400' : 'text-slate-500'}">
                                            ${db.publication_count} ${db.has_publication ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-slate-400">Subscriptions:</span>
                                        <span class="font-medium ${db.has_subscription ? 'text-green-400' : 'text-slate-500'}">
                                            ${db.subscription_count} ${db.has_subscription ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-slate-400">Replication Slots:</span>
                                        <span class="font-medium ${db.slot_count > 0 ? 'text-white' : 'text-slate-500'}">
                                            ${db.active_slots}/${db.slot_count}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4">Summary Statistics</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p class="text-slate-400 text-sm">Total Databases</p>
                            <p class="text-2xl font-bold text-white">${details.length}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-sm">With Publications</p>
                            <p class="text-2xl font-bold text-green-400">${details.filter(d => d.has_publication).length}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-sm">With Subscriptions</p>
                            <p class="text-2xl font-bold text-purple-400">${details.filter(d => d.has_subscription).length}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-sm">Active Replication</p>
                            <p class="text-2xl font-bold text-blue-400">${details.filter(d => d.active_slots > 0).length}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading all databases:', error);
    }
}

let discoveredTables = [];
let batchPollInterval = null;

async function loadDiscrepancyCheck() {
    try {
        const databases = await fetch('/api/databases').then(r => r.json());

        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <h2 class="text-2xl font-bold">Data Discrepancy Check</h2>

                <!-- Batch Check All Databases -->
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-3 flex items-center">
                        <svg class="h-5 w-5 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                        Batch Check All Databases
                    </h3>
                    <p class="text-slate-400 text-sm mb-4">Auto-discovers all tables in every replicated database and compares row counts between source and target.</p>
                    <div class="flex items-center space-x-4 mb-4">
                        <label class="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" id="batchUseEstimate" class="rounded bg-slate-700 border-slate-600">
                            <span class="text-sm">Use estimated counts (fast, from pg_stat_user_tables)</span>
                        </label>
                    </div>
                    <button onclick="startBatchCheck()" id="batchCheckBtn" class="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold w-full">
                        Check All Databases
                    </button>
                    <div id="batchProgress" class="mt-4 hidden">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-slate-400">Progress</span>
                            <span id="batchProgressText" class="text-sm font-mono">0 / 0</span>
                        </div>
                        <div class="w-full bg-slate-700 rounded-full h-3">
                            <div id="batchProgressBar" class="bg-orange-500 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                <div id="batchResults"></div>

                <hr class="border-slate-700">

                <!-- Single Database Check -->
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-3 flex items-center">
                        <svg class="h-5 w-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                        </svg>
                        Single Database Check
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Select Database</label>
                            <div class="flex space-x-2">
                                <select id="dbSelect" class="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2">
                                    <option value="">Choose a database...</option>
                                    ${databases.map(db => `<option value="${db.name}">${db.name} (${db.size})</option>`).join('')}
                                </select>
                                <button onclick="loadTablesForDb()" class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-medium whitespace-nowrap">
                                    Load Tables
                                </button>
                            </div>
                        </div>
                        <div id="tableListContainer" class="hidden">
                            <div class="flex items-center justify-between mb-2">
                                <label class="block text-sm font-medium">Tables</label>
                                <div class="flex space-x-2">
                                    <button onclick="toggleAllTables(true)" class="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded">Select All</button>
                                    <button onclick="toggleAllTables(false)" class="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded">Deselect All</button>
                                </div>
                            </div>
                            <div id="tableCheckboxes" class="max-h-64 overflow-y-auto bg-slate-900/50 rounded-lg p-3 space-y-1"></div>
                            <div id="tableSummary" class="mt-2 text-sm text-slate-400"></div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Or enter table names manually (comma-separated)</label>
                            <input type="text" id="tableInput" placeholder="e.g., users, orders, products" class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2">
                        </div>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" id="singleUseEstimate" class="rounded bg-slate-700 border-slate-600">
                                <span class="text-sm">Use estimated counts (fast)</span>
                            </label>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button onclick="runSingleCheck()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold">
                                Check Row Counts
                            </button>
                            <button onclick="runChecksumCheck()" class="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
                                Deep Checksum Validation
                            </button>
                        </div>
                        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                            <p class="text-yellow-400 text-xs">
                                <strong>Checksum validation</strong> computes MD5 of all row data ordered by primary key. 
                                This is resource-intensive for large tables (~40GB). Use on specific tables you suspect have issues.
                            </p>
                        </div>
                    </div>
                </div>
                <div id="discrepancyResults"></div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading discrepancy check:', error);
    }
}

async function loadTablesForDb() {
    const database = document.getElementById('dbSelect').value;
    if (!database) { alert('Please select a database first'); return; }

    const container = document.getElementById('tableCheckboxes');
    container.innerHTML = '<div class="text-slate-400 text-sm animate-pulse">Loading tables...</div>';
    document.getElementById('tableListContainer').classList.remove('hidden');

    try {
        const resp = await fetch(`/api/tables?database=${encodeURIComponent(database)}`);
        const data = await resp.json();

        const allTables = new Map();
        (data.source_tables || []).forEach(t => {
            const key = t.schema_name + '.' + t.table_name;
            allTables.set(key, { ...t, onSource: true, onTarget: false, sourceEst: t.est_rows, targetEst: 0 });
        });
        (data.target_tables || []).forEach(t => {
            const key = t.schema_name + '.' + t.table_name;
            if (allTables.has(key)) {
                const existing = allTables.get(key);
                existing.onTarget = true;
                existing.targetEst = t.est_rows;
            } else {
                allTables.set(key, { schema_name: t.schema_name, table_name: t.table_name, onSource: false, onTarget: true, sourceEst: 0, targetEst: t.est_rows });
            }
        });

        discoveredTables = Array.from(allTables.entries());

        if (discoveredTables.length === 0) {
            container.innerHTML = '<div class="text-slate-400 text-sm">No tables found in this database.</div>';
            return;
        }

        container.innerHTML = discoveredTables.map(([key, t]) => {
            let badge = '';
            if (!t.onTarget) badge = '<span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded ml-2">Missing on Target</span>';
            else if (!t.onSource) badge = '<span class="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded ml-2">Missing on Source</span>';
            return `
                <label class="flex items-center space-x-2 py-1 px-2 hover:bg-slate-800 rounded cursor-pointer">
                    <input type="checkbox" class="table-cb rounded bg-slate-700 border-slate-600" value="${key}" checked>
                    <span class="text-sm font-mono">${key}</span>
                    <span class="text-xs text-slate-500 ml-auto">~${t.sourceEst.toLocaleString()} / ~${t.targetEst.toLocaleString()} rows</span>
                    ${badge}
                </label>
            `;
        }).join('');

        document.getElementById('tableSummary').textContent =
            `${discoveredTables.length} tables found (${(data.source_tables||[]).length} source, ${(data.target_tables||[]).length} target)`;

        if (data.error) {
            document.getElementById('tableSummary').innerHTML += `<br><span class="text-yellow-400">${data.error}</span>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="text-red-400 text-sm">Error: ${error.message}</div>`;
    }
}

function toggleAllTables(checked) {
    document.querySelectorAll('.table-cb').forEach(cb => cb.checked = checked);
}

function getSelectedTables() {
    const checked = Array.from(document.querySelectorAll('.table-cb:checked')).map(cb => cb.value);
    const manual = (document.getElementById('tableInput').value || '').split(',').map(t => t.trim()).filter(t => t);
    const all = [...new Set([...checked, ...manual])];
    return all;
}

async function runSingleCheck() {
    const database = document.getElementById('dbSelect').value;
    const tables = getSelectedTables();
    const useEstimate = document.getElementById('singleUseEstimate').checked;

    if (!database || tables.length === 0) {
        alert('Please select a database and at least one table');
        return;
    }

    const resultsDiv = document.getElementById('discrepancyResults');
    resultsDiv.innerHTML = '<div class="text-slate-400 animate-pulse p-4">Checking row counts...</div>';

    try {
        const response = await fetch('/api/discrepancy-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database, tables, use_estimate: useEstimate })
        });
        const results = await response.json();
        renderSingleResults(results, useEstimate);
    } catch (error) {
        resultsDiv.innerHTML = `<div class="text-red-400 p-4">Error: ${error.message}</div>`;
    }
}

function renderSingleResults(results, useEstimate) {
    const discrepancies = results.filter(r => r.has_discrepancy);
    const resultsDiv = document.getElementById('discrepancyResults');

    resultsDiv.innerHTML = `
        <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <span class="text-lg font-semibold">${results.length} tables checked</span>
                    ${useEstimate ? '<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Estimated</span>' : '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Exact</span>'}
                </div>
                <div class="flex items-center space-x-3">
                    <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">${results.length - discrepancies.length} in sync</span>
                    ${discrepancies.length > 0 ? `<span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">${discrepancies.length} discrepancies</span>` : ''}
                </div>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-slate-700">
                        <th class="text-left py-3 px-4 text-slate-400 font-medium">Table</th>
                        <th class="text-right py-3 px-4 text-slate-400 font-medium">Source Count</th>
                        <th class="text-right py-3 px-4 text-slate-400 font-medium">Target Count</th>
                        <th class="text-right py-3 px-4 text-slate-400 font-medium">Difference</th>
                        <th class="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr class="border-b border-slate-800 hover:bg-slate-800/50 ${r.has_discrepancy ? 'bg-red-500/5' : ''}">
                            <td class="py-3 px-4 font-mono text-sm">${r.table_name}</td>
                            <td class="py-3 px-4 text-right font-mono">${r.source_count.toLocaleString()}</td>
                            <td class="py-3 px-4 text-right font-mono">${r.target_count.toLocaleString()}</td>
                            <td class="py-3 px-4 text-right font-mono ${r.has_discrepancy ? 'text-red-400 font-bold' : 'text-green-400'}">${r.discrepancy > 0 ? '+' : ''}${r.discrepancy.toLocaleString()}</td>
                            <td class="py-3 px-4 text-center">${r.has_discrepancy
                                ? '<span class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">MISMATCH</span>'
                                : '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">OK</span>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function runChecksumCheck() {
    const database = document.getElementById('dbSelect').value;
    const tables = getSelectedTables();

    if (!database || tables.length === 0) {
        alert('Please select a database and at least one table');
        return;
    }

    if (tables.length > 10) {
        if (!confirm(`You selected ${tables.length} tables for checksum validation. This may take a long time for large tables. Continue?`)) return;
    }

    const resultsDiv = document.getElementById('discrepancyResults');
    resultsDiv.innerHTML = '<div class="text-slate-400 animate-pulse p-4">Computing checksums... This may take a while for large tables.</div>';

    try {
        const response = await fetch('/api/checksum-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database, tables })
        });
        const results = await response.json();
        renderChecksumResults(results);
    } catch (error) {
        resultsDiv.innerHTML = `<div class="text-red-400 p-4">Error: ${error.message}</div>`;
    }
}

function renderChecksumResults(results) {
    const mismatches = results.filter(r => !r.match && !r.error);
    const errors = results.filter(r => r.error);
    const resultsDiv = document.getElementById('discrepancyResults');

    resultsDiv.innerHTML = `
        <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
                <span class="text-lg font-semibold">${results.length} tables checksummed</span>
                <div class="flex items-center space-x-3">
                    <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">${results.length - mismatches.length - errors.length} match</span>
                    ${mismatches.length > 0 ? `<span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">${mismatches.length} mismatch</span>` : ''}
                    ${errors.length > 0 ? `<span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">${errors.length} errors</span>` : ''}
                </div>
            </div>
        </div>
        ${results.map(r => `
            <div class="bg-slate-800/50 card border ${r.error ? 'border-yellow-500/50' : (r.match ? 'border-green-500/50' : 'border-red-500/50')} rounded-lg p-4 mb-3">
                <div class="flex items-center justify-between mb-3">
                    <span class="font-mono font-semibold">${r.table_name}</span>
                    ${r.error
                        ? `<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">ERROR</span>`
                        : (r.match
                            ? '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">MATCH</span>'
                            : '<span class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">MISMATCH</span>')}
                </div>
                ${r.error ? `<p class="text-yellow-400 text-sm">${r.error}</p>` : `
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-slate-400 text-xs mb-1">Source (${r.source_count.toLocaleString()} rows)</p>
                            <p class="font-mono text-xs ${r.match ? 'text-green-400' : 'text-red-400'} break-all">${r.source_checksum}</p>
                        </div>
                        <div>
                            <p class="text-slate-400 text-xs mb-1">Target (${r.target_count.toLocaleString()} rows)</p>
                            <p class="font-mono text-xs ${r.match ? 'text-green-400' : 'text-red-400'} break-all">${r.target_checksum}</p>
                        </div>
                    </div>
                `}
            </div>
        `).join('')}
    `;
}

async function startBatchCheck() {
    const useEstimate = document.getElementById('batchUseEstimate').checked;
    const btn = document.getElementById('batchCheckBtn');
    btn.disabled = true;
    btn.textContent = 'Starting...';
    btn.classList.add('opacity-50');

    document.getElementById('batchProgress').classList.remove('hidden');
    document.getElementById('batchResults').innerHTML = '';

    try {
        const response = await fetch('/api/discrepancy-check-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ use_estimate: useEstimate })
        });

        if (response.status === 409) {
            alert('A batch check is already in progress. Please wait.');
            btn.disabled = false;
            btn.textContent = 'Check All Databases';
            btn.classList.remove('opacity-50');
            return;
        }

        const data = await response.json();
        btn.textContent = `Checking ${data.total_databases} databases...`;

        if (batchPollInterval) clearInterval(batchPollInterval);
        batchPollInterval = setInterval(pollBatchStatus, 2000);
    } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Check All Databases';
        btn.classList.remove('opacity-50');
        alert('Error starting batch check: ' + error.message);
    }
}

async function pollBatchStatus() {
    try {
        const resp = await fetch('/api/discrepancy-check-all/status');
        const data = await resp.json();

        if (data.message === 'no batch check has been started') return;

        const pct = data.total_databases > 0 ? Math.round((data.completed / data.total_databases) * 100) : 0;
        document.getElementById('batchProgressBar').style.width = pct + '%';
        document.getElementById('batchProgressText').textContent = `${data.completed} / ${data.total_databases}`;

        if (!data.in_progress) {
            clearInterval(batchPollInterval);
            batchPollInterval = null;

            const btn = document.getElementById('batchCheckBtn');
            btn.disabled = false;
            btn.textContent = 'Check All Databases';
            btn.classList.remove('opacity-50');

            renderBatchResults(data);
        }
    } catch (error) {
        console.error('Error polling batch status:', error);
    }
}

function renderBatchResults(data) {
    const results = data.results || [];
    const withDiscrepancy = results.filter(r => r.has_discrepancy);
    const withErrors = results.filter(r => r.error);
    const ok = results.filter(r => !r.has_discrepancy && !r.error);

    document.getElementById('batchResults').innerHTML = `
        <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6 mb-4">
            <h3 class="text-lg font-semibold mb-4">Batch Check Summary</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                    <p class="text-slate-400 text-sm">Total Databases</p>
                    <p class="text-2xl font-bold">${results.length}</p>
                </div>
                <div>
                    <p class="text-slate-400 text-sm">In Sync</p>
                    <p class="text-2xl font-bold text-green-400">${ok.length}</p>
                </div>
                <div>
                    <p class="text-slate-400 text-sm">Discrepancies</p>
                    <p class="text-2xl font-bold text-red-400">${withDiscrepancy.length}</p>
                </div>
                <div>
                    <p class="text-slate-400 text-sm">Errors</p>
                    <p class="text-2xl font-bold text-yellow-400">${withErrors.length}</p>
                </div>
            </div>
            ${data.use_estimated ? '<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Estimated counts</span>' : '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Exact counts</span>'}
        </div>

        ${results.sort((a, b) => (b.has_discrepancy ? 1 : 0) - (a.has_discrepancy ? 1 : 0)).map(db => `
            <div class="bg-slate-800/50 card border ${db.error ? 'border-yellow-500/50' : (db.has_discrepancy ? 'border-red-500/50' : 'border-green-500/50')} rounded-lg mb-3">
                <div class="p-4 cursor-pointer" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <span class="w-3 h-3 rounded-full ${db.error ? 'bg-yellow-500' : (db.has_discrepancy ? 'bg-red-500' : 'bg-green-500')}"></span>
                            <span class="font-semibold">${db.database}</span>
                            <span class="text-xs text-slate-400">${db.source_tables} source / ${db.target_tables} target tables</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${db.missing_on_target && db.missing_on_target.length > 0 ? `<span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">${db.missing_on_target.length} missing on target</span>` : ''}
                            ${db.missing_on_source && db.missing_on_source.length > 0 ? `<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">${db.missing_on_source.length} extra on target</span>` : ''}
                            ${db.error ? `<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Error</span>` : ''}
                            <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                    </div>
                </div>
                <div class="hidden border-t border-slate-700 p-4">
                    ${db.error ? `<p class="text-yellow-400 text-sm mb-3">${db.error}</p>` : ''}
                    ${db.missing_on_target && db.missing_on_target.length > 0 ? `
                        <div class="mb-3">
                            <p class="text-red-400 text-sm font-semibold mb-1">Missing on Target:</p>
                            <div class="flex flex-wrap gap-1">${db.missing_on_target.map(t => `<span class="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded font-mono">${t}</span>`).join('')}</div>
                        </div>
                    ` : ''}
                    ${db.missing_on_source && db.missing_on_source.length > 0 ? `
                        <div class="mb-3">
                            <p class="text-yellow-400 text-sm font-semibold mb-1">Extra on Target (not on source):</p>
                            <div class="flex flex-wrap gap-1">${db.missing_on_source.map(t => `<span class="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded font-mono">${t}</span>`).join('')}</div>
                        </div>
                    ` : ''}
                    ${db.table_results && db.table_results.length > 0 ? `
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-slate-700">
                                    <th class="text-left py-2 px-3 text-slate-400 font-medium text-xs">Table</th>
                                    <th class="text-right py-2 px-3 text-slate-400 font-medium text-xs">Source</th>
                                    <th class="text-right py-2 px-3 text-slate-400 font-medium text-xs">Target</th>
                                    <th class="text-right py-2 px-3 text-slate-400 font-medium text-xs">Diff</th>
                                    <th class="text-center py-2 px-3 text-slate-400 font-medium text-xs">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${db.table_results.map(t => `
                                    <tr class="border-b border-slate-800 ${t.has_discrepancy ? 'bg-red-500/5' : ''}">
                                        <td class="py-2 px-3 font-mono text-xs">${t.table_name}</td>
                                        <td class="py-2 px-3 text-right font-mono text-xs">${t.source_count.toLocaleString()}</td>
                                        <td class="py-2 px-3 text-right font-mono text-xs">${t.target_count.toLocaleString()}</td>
                                        <td class="py-2 px-3 text-right font-mono text-xs ${t.has_discrepancy ? 'text-red-400 font-bold' : 'text-green-400'}">${t.discrepancy > 0 ? '+' : ''}${t.discrepancy.toLocaleString()}</td>
                                        <td class="py-2 px-3 text-center">${t.has_discrepancy
                                            ? '<span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">MISMATCH</span>'
                                            : '<span class="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">OK</span>'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-slate-400 text-sm">No table comparison data available.</p>'}
                </div>
            </div>
        `).join('')}
    `;
}
