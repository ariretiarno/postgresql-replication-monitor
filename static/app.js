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

async function loadDiscrepancyCheck() {
    try {
        const databases = await fetch('/api/databases').then(r => r.json());
        
        document.getElementById('tabContent').innerHTML = `
            <div class="space-y-6">
                <h2 class="text-2xl font-bold">Data Discrepancy Check</h2>
                <div class="bg-slate-800/50 card border border-slate-700 rounded-lg p-6">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Select Database</label>
                            <select id="dbSelect" class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2">
                                <option value="">Choose a database...</option>
                                ${databases.map(db => `<option value="${db.name}">${db.name} (${db.size})</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Table Names (comma-separated)</label>
                            <input type="text" id="tableInput" placeholder="e.g., users, orders, products" class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2">
                            <p class="text-slate-400 text-sm mt-1">Enter table names separated by commas</p>
                        </div>
                        <button onclick="checkDiscrepancy()" class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg">Check Discrepancy</button>
                    </div>
                </div>
                <div id="discrepancyResults"></div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading discrepancy check:', error);
    }
}

async function checkDiscrepancy() {
    const database = document.getElementById('dbSelect').value;
    const tables = document.getElementById('tableInput').value;
    
    if (!database || !tables) {
        alert('Please select a database and enter table names');
        return;
    }

    const tableList = tables.split(',').map(t => t.trim()).filter(t => t);
    
    try {
        const response = await fetch('/api/discrepancy-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database, tables: tableList })
        });
        const results = await response.json();
        
        document.getElementById('discrepancyResults').innerHTML = `
            <h3 class="text-xl font-semibold mb-4">Results</h3>
            ${results.map(result => `
                <div class="bg-slate-800/50 card border ${result.has_discrepancy ? 'border-red-500' : 'border-green-500'} rounded-lg p-6 mb-4">
                    <div class="flex justify-between mb-4">
                        <div><h4 class="text-lg font-semibold">${result.table_name}</h4><p class="text-sm text-slate-400">${result.database}</p></div>
                        ${result.has_discrepancy ? '<span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">Discrepancy Found</span>' : '<span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">In Sync</span>'}
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div><p class="text-slate-400 text-sm">Source Count</p><p class="text-2xl font-bold">${result.source_count.toLocaleString()}</p></div>
                        <div><p class="text-slate-400 text-sm">Target Count</p><p class="text-2xl font-bold">${result.target_count.toLocaleString()}</p></div>
                        <div><p class="text-slate-400 text-sm">Difference</p><p class="text-2xl font-bold ${result.has_discrepancy ? 'text-red-500' : 'text-green-500'}">${result.discrepancy > 0 ? '+' : ''}${result.discrepancy.toLocaleString()}</p></div>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Error checking discrepancy:', error);
        alert('Error checking discrepancy');
    }
}
