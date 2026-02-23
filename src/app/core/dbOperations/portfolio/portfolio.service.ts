import { Injectable } from '@angular/core';
import {
    QueryFn,
} from '@angular/fire/compat/firestore';
import {
    BehaviorSubject,
    Observable,
    tap,
} from 'rxjs';
import { Portfolio } from './portfolio.types';
import { PortfolioFirestore } from './portfolio.firestore';

@Injectable({
    providedIn: 'root',
})
export class PortfolioService {
    private _portfolios: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    currentPortfolio = new BehaviorSubject(null);
    currentPortfolioId = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(
        private portfolioFirestore: PortfolioFirestore,
    ) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for portfolio
     *
     * @param value
     */
    set portfolio(value: Portfolio) {
        // Store the value
        this._portfolios.next(value);
    }

    get portfolio$(): Observable<Portfolio> {
        // Return the value
        return this._portfolios.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all portfolios
     * @returns
     */
    async getAllPortfolios() {
        return this.portfolioFirestore.getCollection();
    }

    /**
     * Get portfolio by ID
     * @param docId
     * @returns
     */
    async getPortfolioByIdOnce(docId: string) {
        return this.portfolioFirestore.getDocumentOnce(docId).pipe(
            tap((portfolio) => {
                return this.currentPortfolio.next(portfolio);
            })
        );
    }

    /**
     * Get portfolio by query
     * @param query
     * @returns
     */
    async getWithQuery(query: QueryFn): Promise<Observable<any>> {
        return this.portfolioFirestore.getQueryWithGet(query).pipe(
            tap((portfolios) => {
                return this._portfolios.next(portfolios);
            })
        );
    }

    /**
     * Create portfolio without existing docId
     * @param value
     * @returns
     */
    create(value: Portfolio): Promise<any> {
        return this.portfolioFirestore.create(value);
    }

    /**
     * Create portfolio with existing docId
     * @param value
     * @param docId
     * @returns
     */
    async createWithId(value: Portfolio, docId: string) {
        return await this.portfolioFirestore.createWithId(value, docId);
    }

    /**
     * Update portfolio
     * @param value
     * @param docId
     * @returns
     */
    updatePortfolio(value: Portfolio, docId: string) {
        return this.portfolioFirestore.update(value, docId);
    }

    /**
     * Update single field in portfolio
     * @param key
     * @param value
     * @param docId
     * @returns
     */
    updatePortfolioSingleField(key: string, value: any, docId: string) {
        return this.portfolioFirestore.updateSingleField(key, value, docId);
    }

    /**
     * Delete portfolio by docId
     * @param docId
     * @returns
     */
    delete(docId: string) {
        return this.portfolioFirestore.delete(docId);
    }

}
