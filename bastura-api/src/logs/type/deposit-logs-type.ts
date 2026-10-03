export interface deposit_logs {
    timestamp: Date;
    message: string;
    status: 'success' | 'error' | 'warning';
    procces: string;
    deposit_type: string;
}
