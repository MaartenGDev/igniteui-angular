import {
    ChangeDetectorRef,
    Component,
    Input,
    TemplateRef,
    ViewChild,
    HostBinding,
    AfterViewInit,
    ElementRef,
    OnInit,
    ChangeDetectionStrategy,
    DoCheck
} from '@angular/core';
import { IgxColumnComponent } from '../../columns/column.component';
import { IFilteringExpression } from '../../../data-operations/filtering-expression.interface';
import { IBaseChipEventArgs, IgxChipsAreaComponent, IgxChipComponent } from '../../../chips';
import { IgxFilteringService, ExpressionUI } from '../grid-filtering.service';

/**
 * @hidden
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false,
    selector: 'igx-grid-filtering-cell',
    templateUrl: './grid-filtering-cell.component.html'
})
export class IgxGridFilteringCellComponent implements AfterViewInit, OnInit, DoCheck {

    private baseClass = 'igx-grid__filtering-cell-indicator';
    private currentTemplate = null;

    public expressionsList: ExpressionUI[];
    public moreFiltersCount = 0;

    @Input()
    public column: IgxColumnComponent;

    @ViewChild('emptyFilter', { read: TemplateRef, static: true })
    protected emptyFilter: TemplateRef<any>;

    @ViewChild('defaultFilter', { read: TemplateRef, static: true })
    protected defaultFilter: TemplateRef<any>;

    @ViewChild('complexFilter', { read: TemplateRef, static: true })
    protected complexFilter: TemplateRef<any>;

    @ViewChild('chipsArea', { read: IgxChipsAreaComponent })
    protected chipsArea: IgxChipsAreaComponent;

    @ViewChild('moreIcon', { read: ElementRef })
    protected moreIcon: ElementRef;

    @ViewChild('ghostChip', { read: IgxChipComponent })
    protected ghostChip: IgxChipComponent;

    @ViewChild('complexChip', { read: IgxChipComponent })
    protected complexChip: IgxChipComponent;


    @HostBinding('class')
    get styleClasses(): string {
        if (this.column && this.column.selected) {
            return 'igx-grid__filtering-cell--selected';
        }

        return 'igx-grid__filtering-cell';
    }

    constructor(public cdr: ChangeDetectorRef, public filteringService: IgxFilteringService) {
        this.filteringService.subscribeToEvents();
    }

    ngOnInit(): void {
        this.filteringService.columnToMoreIconHidden.set(this.column.field, true);
    }

    ngAfterViewInit(): void {
        this.updateFilterCellArea();
    }

    public ngDoCheck() {
        this.updateFilterCellArea();
    }

    /**
     * Returns whether a chip with a given index is visible or not.
     */
    public isChipVisible(index: number) {
        const expression = this.expressionsList[index];
        return !!(expression && expression.isVisible);
    }

    /**
     * Updates the filtering cell area.
     */
    public updateFilterCellArea() {
        this.expressionsList = this.filteringService.getExpressions(this.column.field);
        this.updateVisibleFilters();
    }

    get template(): TemplateRef<any> {
        if (!this.column.filterable) {
            this.currentTemplate = null;
            return null;
        }

        if (this.column.filterCellTemplate) {
            this.currentTemplate = this.column.filterCellTemplate;
            return this.column.filterCellTemplate;
        }

        const expressionTree = this.column.filteringExpressionsTree;
        if (!expressionTree || expressionTree.filteringOperands.length === 0) {
            this.currentTemplate = this.emptyFilter;
            return this.emptyFilter;
        }

        if (this.filteringService.isFilterComplex(this.column.field)) {
            this.currentTemplate = this.complexFilter;
            return this.complexFilter;
        }

        this.currentTemplate = this.defaultFilter;
        return this.defaultFilter;
    }

    /**
     * Gets the context passed to the filter template.
     * @memberof IgxGridFilteringCellComponent
     */
    get context() {
        return {
            column: this.column
        };
    }

    /**
     * Chip clicked event handler.
     */
    public onChipClicked(expression?: IFilteringExpression) {
        if (expression) {
            this.expressionsList.forEach((item) => {
                item.isSelected = (item.expression === expression);
            });
        } else if (this.expressionsList.length > 0) {
            this.expressionsList.forEach((item) => {
                item.isSelected = false;
            });
            this.expressionsList[0].isSelected = true;
        }
        this.filteringService.grid.navigation.performHorizontalScrollToCell(this.column.visibleIndex);
        this.filteringService.filteredColumn = this.column;
        this.filteringService.isFilterRowVisible = true;
        this.filteringService.selectedExpression = expression;
    }

    /**
     * Chip removed event handler.
     */
    public onChipRemoved(eventArgs: IBaseChipEventArgs, item: ExpressionUI): void {
        const indexToRemove = this.expressionsList.indexOf(item);
        this.removeExpression(indexToRemove);
        this.focusChip();
    }

    /**
     * Clears the filtering.
     */
    public clearFiltering(): void {
        this.filteringService.clearFilter(this.column.field);
        this.cdr.detectChanges();
    }

    /**
     * Chip keydown event handler.
     */
    public onChipKeyDown(eventArgs: KeyboardEvent, expression?: IFilteringExpression) {
            eventArgs.preventDefault();
            this.onChipClicked(expression);
    }

    /**
     * Returns the filtering indicator class.
     */
    public filteringIndicatorClass() {
        return {
            [this.baseClass]: !this.isMoreIconHidden(),
            [`${this.baseClass}--hidden`]: this.isMoreIconHidden()
        };
    }

    /**
     * Focus a chip depending on the current visible template.
     */
    public focusChip(focusFirst: boolean = false) {
        if (this.currentTemplate === this.defaultFilter) {
            if (focusFirst) {
                this.focusFirstElement();
            } else {
                this.focusElement();
            }
        } else if (this.currentTemplate === this.emptyFilter) {
            this.ghostChip.elementRef.nativeElement.querySelector(`.igx-chip__item`).focus();
        } else if (this.currentTemplate === this.complexFilter) {
            this.complexChip.elementRef.nativeElement.querySelector(`.igx-chip__item`).focus();
        }
    }

    private removeExpression(indexToRemove: number) {
        if (indexToRemove === 0 && this.expressionsList.length === 1) {
            this.clearFiltering();
            return;
        }

        this.filteringService.removeExpression(this.column.field, indexToRemove);

        this.updateVisibleFilters();
        this.filteringService.filterInternal(this.column.field);
    }

    private isMoreIconHidden(): boolean {
        return this.filteringService.columnToMoreIconHidden.get(this.column.field);
    }

    private updateVisibleFilters() {
        this.expressionsList.forEach((ex) => ex.isVisible = true);

        if (this.moreIcon) {
            this.filteringService.columnToMoreIconHidden.set(this.column.field, true);
        }
        this.cdr.detectChanges();

        if (this.chipsArea && this.expressionsList.length > 1) {
            const areaWidth = this.chipsArea.element.nativeElement.offsetWidth;
            let viewWidth = 0;
            const chipsAreaElements = this.chipsArea.element.nativeElement.children;
            let visibleChipsCount = 0;
            const moreIconWidth = this.moreIcon.nativeElement.offsetWidth -
                parseInt(document.defaultView.getComputedStyle(this.moreIcon.nativeElement)['margin-left'], 10);

            for (let index = 0; index < chipsAreaElements.length - 1; index++) {
                if (viewWidth + chipsAreaElements[index].offsetWidth < areaWidth) {
                    viewWidth += chipsAreaElements[index].offsetWidth;
                    if (index % 2 === 0) {
                        visibleChipsCount++;
                    } else {
                        viewWidth += parseInt(document.defaultView.getComputedStyle(chipsAreaElements[index])['margin-left'], 10);
                        viewWidth += parseInt(document.defaultView.getComputedStyle(chipsAreaElements[index])['margin-right'], 10);
                    }
                } else {
                    if (index % 2 !== 0 && viewWidth + moreIconWidth > areaWidth) {
                        visibleChipsCount--;
                    } else if (visibleChipsCount > 0 && viewWidth - chipsAreaElements[index - 1].offsetWidth + moreIconWidth > areaWidth) {
                        visibleChipsCount--;
                    }
                    this.moreFiltersCount = this.expressionsList.length - visibleChipsCount;
                    this.filteringService.columnToMoreIconHidden.set(this.column.field, false);
                    break;
                }
            }

            for (let i = visibleChipsCount; i < this.expressionsList.length; i++) {
                this.expressionsList[i].isVisible = false;
            }
            this.cdr.detectChanges();
        }
    }
    private focusFirstElement(): void {
        if (this.chipsArea.chipsList.length > 0) {
            this.chipsArea.chipsList.first.elementRef.nativeElement.querySelector(`.igx-chip__item`).focus();
        } else {
            this.moreIcon.nativeElement.focus();
        }
    }

    private focusElement(): void {
        if (this.filteringService.shouldFocusNext) {
            if (!this.isMoreIconHidden() && this.chipsArea.chipsList.length === 0) {
                this.moreIcon.nativeElement.focus();
            } else {
                this.chipsArea.chipsList.first.elementRef.nativeElement.querySelector(`.igx-chip__item`).focus();
            }
        } else {
            if (!this.isMoreIconHidden()) {
                this.moreIcon.nativeElement.focus();
            } else {
                this.chipsArea.chipsList.last.elementRef.nativeElement.querySelector(`.igx-chip__remove`).focus();
            }
        }
    }
}
