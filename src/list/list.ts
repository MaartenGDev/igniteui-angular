import { Component, Input, Output, AfterContentInit, ContentChildren, QueryList, EventEmitter } from '@angular/core';
import { ContainsPipe } from './filter-pipe';
import { ListItem, ListHeader } from './items';

declare var module: any;

@Component({
    selector: 'ig-list',
    host: { 'role': 'list' },
    pipes: [ ContainsPipe ],
    moduleId: module.id, // commonJS standard
    directives: [ListItem, ListHeader],
    templateUrl: 'list-content.html'
})

export class List implements AfterContentInit {
    //@ContentChildren(ListItem) _items: QueryList<ListItem>;
    @ContentChildren(ListItem) items: QueryList<ListItem>;
    @ContentChildren(ListHeader) headers: QueryList<ListHeader>;

    private _innerStyle: string = "ig-list-inner";
    private _searchInputElement: HTMLElement;

    isCaseSensitiveFiltering: boolean = false;

    @Input() searchInputId: string;
    @Output() filtering = new EventEmitter();
    @Output() filtered = new EventEmitter();

    constructor() {        
    }

    ngAfterContentInit() {
        var self = this;
        if(this.searchInputId) {
            this._searchInputElement = document.getElementById(this.searchInputId);
            if(this._searchInputElement) {
                this._searchInputElement.addEventListener("input", function() {
                    self.filter();
                });
            }            
        }
    }

    filter() {
        var searchText, result, metConditionFunction, overdueConditionFunction;

        if(this._searchInputElement) {
            this.filtering.emit({
                // TODO: cancel filtering
            });

            searchText = (<HTMLInputElement>this._searchInputElement).value;        
            metConditionFunction = (item) => { item.hidden = false; }, 
            overdueConditionFunction = (item) => { item.hidden = true; };        

            var result = new ContainsPipe().transform(this.items, searchText, this.isCaseSensitiveFiltering, metConditionFunction, overdueConditionFunction);

            this.filtered.emit({
                result: result
            });
        }        
    }
}