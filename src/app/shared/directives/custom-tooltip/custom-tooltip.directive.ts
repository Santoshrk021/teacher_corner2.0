import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCustomTooltip]'
})
export class CustomTooltipDirective implements OnDestroy {
  @Input('appCustomTooltip') tooltipText: string;
  private tooltipElement: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnDestroy(): void {
    this.removeTooltip();
  }

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
    if (!this.tooltipElement) {
      this.createTooltip();
    }
    this.setPosition(event);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.removeTooltip();
  }

  private createTooltip() {
    this.tooltipElement = this.renderer.createElement('span');
    this.renderer.addClass(this.tooltipElement, 'cursor-tooltip');

    if (this.tooltipText) {
      this.tooltipElement.textContent = this.tooltipText;
      this.renderer.appendChild(document.body, this.tooltipElement);  // Attach to body

      // Set tooltip styles
      this.renderer.setStyle(this.tooltipElement, 'position', 'absolute');
      this.renderer.setStyle(this.tooltipElement, 'backgroundColor', '#343e4ede');
      this.renderer.setStyle(this.tooltipElement, 'color', '#fff');
      this.renderer.setStyle(this.tooltipElement, 'padding', '10px');
      this.renderer.setStyle(this.tooltipElement, 'borderRadius', '4px');
      this.renderer.setStyle(this.tooltipElement, 'whiteSpace', 'normal');
      this.renderer.setStyle(this.tooltipElement, 'maxWidth', '400px');
      this.renderer.setStyle(this.tooltipElement, 'zIndex', '1000');
      this.renderer.setStyle(this.tooltipElement, 'font-size', '10px');
      this.renderer.setStyle(this.tooltipElement, 'pointerEvents', 'none');
    }
  }

  private setPosition(event: MouseEvent) {
    const tooltipOffset = 15;  // Distance from the cursor

    // Get tooltip dimensions
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const tooltipHeight = tooltipRect.height;
    const tooltipWidth = tooltipRect.width;

    // Calculate the tooltip's desired position (above the cursor)
    let tooltipX = event.pageX + tooltipOffset;
    let tooltipY = event.pageY - tooltipHeight - tooltipOffset;  // Position above the cursor

    // Ensure tooltip stays within the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust to the left if going off the right edge
    if (tooltipX + tooltipWidth > viewportWidth) {
      tooltipX = event.pageX - tooltipWidth - tooltipOffset;
    }

    // If the tooltip goes above the top edge, position it below the cursor instead
    if (tooltipY < 0) {
      tooltipY = event.pageY + tooltipOffset;
    }

    // Set the tooltip position
    this.renderer.setStyle(this.tooltipElement, 'left', `${tooltipX}px`);
    this.renderer.setStyle(this.tooltipElement, 'top', `${tooltipY}px`);
  }

  private removeTooltip() {
    if (this.tooltipElement) {
      this.renderer.removeChild(document.body, this.tooltipElement);
      this.tooltipElement = null;
    }
  }
}
