import { Button } from "./Layout";
import { MonthPicker } from "./MonthPicker";

export function BillToolbar({
  idPrefix,
  search,
  restaurant,
  restaurants,
  month,
  year,
  sort,
  years,
  searchPlaceholder,
  onSearchChange,
  onRestaurantChange,
  onMonthChange,
  onYearChange,
  onSortChange,
  onReset,
}: {
  idPrefix: string;
  search: string;
  restaurant: string;
  restaurants: string[];
  month: string;
  year: string;
  sort: "asc" | "desc";
  years: number[];
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onRestaurantChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onSortChange: (value: "asc" | "desc") => void;
  onReset: () => void;
}) {
  const yearOptions = years.length > 0 ? years : [new Date().getFullYear()];
  const restaurantOptions =
    restaurant && !restaurants.includes(restaurant) ? [restaurant, ...restaurants] : restaurants;

  return (
    <div className="bill-toolbar">
      <div className="field">
        <label htmlFor={`${idPrefix}-search`}>Search</label>
        <input
          id={`${idPrefix}-search`}
          className="input"
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-restaurant`}>Restaurant</label>
        <select
          id={`${idPrefix}-restaurant`}
          className="select"
          value={restaurant}
          onChange={(e) => onRestaurantChange(e.target.value)}
        >
          <option value="">All restaurants</option>
          {restaurantOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="bill-toolbar-row">
        <div className="field">
          <label htmlFor={`${idPrefix}-month`}>Month</label>
          <MonthPicker id={`${idPrefix}-month`} value={month} onChange={onMonthChange} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-year`}>Year</label>
          <select
            id={`${idPrefix}-year`}
            className="select"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          >
            <option value="">All years</option>
            {yearOptions.map((item) => (
              <option key={item} value={String(item)}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-sort`}>Sort</label>
          <select
            id={`${idPrefix}-sort`}
            className="select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value === "asc" ? "asc" : "desc")}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <Button className="btn-secondary" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
